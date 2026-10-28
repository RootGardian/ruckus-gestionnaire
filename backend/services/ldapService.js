const { authenticate } = require('ldap-authentication');
const { LdapConfig } = require('../models');
const ldap = require('ldapjs');

// Liste des comptes sensibles et protégés du domaine Active Directory
const PROTECTED_ACCOUNTS = ['krbtgt', 'administrator', 'administrateur', 'admin', 'guest', 'invité', 'invite', 'defaultaccount', 'system'];

/**
 * Vérifie si un compte est un compte système protégé (krbtgt, Administrator/Administrateur, Guest, ou machine se terminant par $)
 */
const isSystemOrProtectedAccount = (identifier) => {
  if (!identifier) return false;
  const clean = String(identifier).trim().toLowerCase();
  return clean.endsWith('$') || PROTECTED_ACCOUNTS.includes(clean);
};

/**
 * Détermine l'URL complète de connexion LDAP ou LDAPS
 */
const getLdapUrl = (config) => {
  const server = config.server || '127.0.0.1';
  if (server.includes('://')) return server;
  const isSsl = parseInt(config.port, 10) === 636 || config.use_ssl === true;
  const protocol = isSsl ? 'ldaps' : 'ldap';
  return `${protocol}://${server}:${config.port || (isSsl ? 636 : 389)}`;
};

/**
 * Normalise ou déduit les formats valides pour le Bind Active Directory
 * Si l'utilisateur saisit juste "Administrateur", on prépare les variantes:
 * 1. Format UPN : Administrateur@bcrg.gn
 * 2. Format DN : CN=Administrateur,CN=Users,DC=bcrg,DC=gn
 * 3. Identifiant brut
 */
const getBindCandidates = (bindDn, baseDn, serverName) => {
  if (!bindDn) return [];
  const clean = String(bindDn).trim();

  // Si c'est déjà un DN complet (ex: CN=...,DC=...)
  if (clean.toLowerCase().includes('dc=')) {
    return [clean];
  }

  // Extraire l'identifiant court (sans @domain ni DOMAIN\)
  let shortUser = clean;
  if (shortUser.includes('@')) {
    shortUser = shortUser.split('@')[0];
  } else if (shortUser.includes('\\')) {
    shortUser = shortUser.split('\\')[1];
  }

  // Dériver le nom NetBIOS ou domaine depuis baseDn (ex: DC=bcrg,DC=gn -> netbios: bcrg, domain: bcrg.gn)
  let netbios = 'bcrg';
  let domain = serverName || '';
  if (baseDn) {
    const dcs = baseDn.split(',')
      .map(p => p.trim())
      .filter(p => p.toUpperCase().startsWith('DC='))
      .map(p => p.split('=')[1]);
    if (dcs.length > 0) {
      netbios = dcs[0];
      domain = dcs.join('.');
    }
  }

  const candidates = [];
  // 1. Format DN canonique Active Directory (CN=Administrateur,CN=Users,DC=bcrg,DC=gn) - Garanti AD
  if (baseDn) {
    candidates.push(`CN=${shortUser},CN=Users,${baseDn}`);
  }
  // 2. Format NetBIOS Windows (ex: bcrg\Administrateur)
  if (netbios) {
    candidates.push(`${netbios}\\${shortUser}`);
  }
  // 3. Format UPN (ex: Administrateur@bcrg.gn)
  if (domain) {
    candidates.push(`${shortUser}@${domain}`);
  }
  // 4. Chaîne d'origine saisie
  if (!candidates.includes(clean)) {
    candidates.push(clean);
  }

  return candidates;
};

/**
 * Crée un client LDAPjs configuré avec support LDAPS et TLS auto-signé
 */
const createLdapClient = async (config) => {
  return new Promise((resolve, reject) => {
    const url = getLdapUrl(config);
    const client = ldap.createClient({
      url,
      connectTimeout: 8000,
      timeout: 8000,
      tlsOptions: {
        rejectUnauthorized: false // Permet les certificats internes/auto-signés Active Directory
      }
    });

    client.on('error', (err) => {
      reject(err);
    });

    if (config.use_bind && config.bind_dn && config.bind_password) {
      const candidates = getBindCandidates(config.bind_dn, config.base_dn, config.name);
      const cleanPassword = String(config.bind_password || '').trim();

      const tryBind = (index) => {
        if (index >= candidates.length) {
          return reject(new Error("Échec d'authentification Bind : identifiant ou mot de passe invalide."));
        }
        const currentDn = candidates[index];
        client.bind(currentDn, cleanPassword, (err) => {
          if (err) {
            if (index + 1 < candidates.length) {
              return tryBind(index + 1);
            }
            return reject(err);
          }
          resolve(client);
        });
      };

      tryBind(0);
    } else {
      resolve(client);
    }
  });
};

/**
 * Authentification LDAP pour connexion utilisateur
 */
const authenticateLdap = async (identifier, password) => {
  try {
    const config = await LdapConfig.findOne({ where: { is_active: true } });
    if (!config) {
      return { success: false, message: "Aucune configuration LDAP active." };
    }

    const url = getLdapUrl(config);

    let options = {
      ldapOpts: {
        url,
        connectTimeout: 15000,
        timeout: 15000,
        tlsOptions: { rejectUnauthorized: false }
      },
      userPassword: password,
      userSearchBase: config.base_dn,
      username: identifier.includes('@') ? identifier.split('@')[0] : identifier,
      usernameFilter: `(|(${config.identifier_field || 'sAMAccountName'}={{username}})(mail={{username}})(employeeID={{username}}))`,
      attributes: ['dn', 'cn', 'sAMAccountName', 'mail', 'userPrincipalName', 'givenName', 'sn', 'department', 'employeeID', 'employeeNumber', 'memberOf', 'description']
    };

    if (config.use_bind && config.bind_dn && config.bind_password) {
      options.adminDn = config.bind_dn;
      options.adminPassword = config.bind_password;
    } else {
      options.userDn = identifier.includes('@') ? identifier : `${identifier}@${config.name}`;
    }

    let authenticatedUser;
    try {
      authenticatedUser = await authenticate(options);
    } catch (authErr) {
      const errMsg = authErr.message || '';
      const isReferral = errMsg.includes('RefErr') || errMsg.includes('0000202B') || errMsg.includes('Referral') || authErr.code === 10;

      if (isReferral) {
        console.warn("⚠️ AD Referral détecté sur port 389. Tentative automatique via Catalogue Global (port 3268)...");
        try {
          const gcOptions = {
            ...options,
            ldapOpts: {
              ...options.ldapOpts,
              url: `ldap://${config.server}:3268`
            }
          };
          authenticatedUser = await authenticate(gcOptions);
        } catch (gcErr) {
          const domain = config.base_dn
            ? config.base_dn.split(',').filter(p => p.toUpperCase().startsWith('DC=')).map(p => p.split('=')[1]).join('.')
            : 'bcrg.guinee.org';
          const upn = identifier.includes('@') ? identifier : `${identifier}@${domain}`;
          const directOptions = {
            ldapOpts: options.ldapOpts,
            userDn: upn,
            userPassword: password
          };
          const directRes = await authenticate(directOptions);
          authenticatedUser = directRes || { sAMAccountName: identifier, mail: upn };
        }
      } else {
        throw authErr;
      }
    }

    return { success: true, user: authenticatedUser };
  } catch (error) {
    const friendlyMessage = formatLdapErrorMessage(error.message || error);
    console.error("LDAP Auth error:", error.message || error, "->", friendlyMessage);
    return { success: false, message: friendlyMessage, rawError: error.message };
  }
};

/**
 * Traduction des codes d'erreur Win32 / Active Directory en messages explicites
 */
const formatLdapErrorMessage = (rawError) => {
  const msg = typeof rawError === 'string' ? rawError : (rawError?.message || '');

  if (/data 52e/i.test(msg) || /data 525/i.test(msg) || /InvalidCredentials/i.test(msg) || /80090308/i.test(msg)) {
    return "Identifiant ou mot de passe incorrect.";
  }
  if (/data 530/i.test(msg)) {
    return "Connexion non autorisée sur cette plage horaire.";
  }
  if (/data 531/i.test(msg)) {
    return "Connexion non autorisée depuis ce poste de travail.";
  }
  if (/data 532/i.test(msg)) {
    return "Votre mot de passe a expiré.";
  }
  if (/data 533/i.test(msg)) {
    return "Ce compte Active Directory est désactivé.";
  }
  if (/data 701/i.test(msg)) {
    return "Ce compte Active Directory a expiré.";
  }
  if (/data 773/i.test(msg)) {
    return "L'utilisateur doit réinitialiser son mot de passe.";
  }
  if (/data 775/i.test(msg)) {
    return "Compte verrouillé suite à plusieurs tentatives infructueuses.";
  }
  if (/00000052|DSID-03152771|unwilling to perform/i.test(msg)) {
    return "Active Directory exige une connexion sécurisée LDAPS (port 636) pour modifier un mot de passe ou le mot de passe ne respecte pas les critères de complexité du domaine.";
  }
  if (/ECONNREFUSED/i.test(msg) || /ETIMEDOUT/i.test(msg) || /ENOTFOUND/i.test(msg) || /connect ECONN/i.test(msg) || /connection timeout/i.test(msg) || /timeout/i.test(msg)) {
    return "Le serveur Active Directory est inaccessible (délai d'attente dépassé / timeout). L'adresse IP ou le port 389 n'est pas joignable depuis cette machine ou nécessite une connexion VPN/réseau local.";
  }
  if (/RefErr|0000202B|Referral/i.test(msg)) {
    return "Erreur d'aiguillage de partition Active Directory (Referral).";
  }

  return msg || "Erreur de communication avec l'annuaire Active Directory.";
};

/**
 * Test de connexion simple
 */
const testLdapConnection = async (config) => {
  return new Promise((resolve) => {
    const url = getLdapUrl(config);
    const client = ldap.createClient({
      url,
      connectTimeout: 8000,
      timeout: 8000,
      tlsOptions: { rejectUnauthorized: false }
    });

    client.on('error', (err) => {
      resolve({ success: false, message: formatLdapErrorMessage(err) });
    });

    if (config.use_bind && config.bind_dn && config.bind_password) {
      const candidates = getBindCandidates(config.bind_dn, config.base_dn, config.name);
      const cleanPassword = String(config.bind_password || '').trim();

      const tryBindTest = (index) => {
        if (index >= candidates.length) {
          resolve({
            success: false,
            message: "Échec d'authentification Bind : identifiant ou mot de passe invalide. Conseil : utilisez 'CN=Administrateur,CN=Users,DC=bcrg,DC=gn' ou 'bcrg\\Administrateur'."
          });
          return;
        }

        const currentDn = candidates[index];
        client.bind(currentDn, cleanPassword, (err) => {
          if (err) {
            if (index + 1 < candidates.length) {
              return tryBindTest(index + 1);
            }
            resolve({
              success: false,
              message: formatLdapErrorMessage(err) || `Échec d'authentification avec "${config.bind_dn}".`
            });
          } else {
            client.unbind();
            resolve({
              success: true,
              message: `Connexion et authentification réussies sur ${url} (via ${currentDn})`
            });
          }
        });
      };

      tryBindTest(0);
    } else {
      resolve({ success: false, message: "Le test anonyme n'est pas supporté par cet outil." });
    }
  });
};

/**
 * Recherche générique dans l'annuaire
 */
const searchLdap = async (config, filter, attributes) => {
  return new Promise(async (resolve, reject) => {
    try {
      const client = await createLdapClient(config);
      const opts = {
        filter: filter,
        scope: 'sub',
        attributes: attributes,
        paged: true,
        sizeLimit: 1000
      };

      client.search(config.base_dn, opts, (err, res) => {
        if (err) {
          client.unbind();
          return reject(err);
        }

        const entries = [];
        res.on('searchEntry', (entry) => {
          entries.push(entry.pojo);
        });
        res.on('searchReference', () => {});
        res.on('error', (err) => {
          const isRef = err.name === 'ReferralError' || err.code === 10 || (err.message && err.message.includes('Referral'));
          if (isRef) {
            client.unbind();
            return resolve(entries);
          }
          client.unbind();
          reject(err);
        });
        res.on('end', () => {
          client.unbind();
          resolve(entries);
        });
      });
    } catch (err) {
      reject(err);
    }
  });
};

/**
 * Nettoie et rétablit les caractères accentués français altérés en point d'interrogation '?'
 * dans l'annuaire Active Directory (ex: P?p? -> Pépé, Fran?ois -> François, etc.)
 */
const cleanAdName = (str) => {
  if (!str) return '';
  let s = String(str);

  // 1. Trémas, cédilles et cas particuliers fréquents
  s = s.replace(/Fran\?ois/gi, m => m[0] === 'F' ? 'François' : 'françois');
  s = s.replace(/A\?ssata/gi, 'Aïssata');
  s = s.replace(/Ba\?lo/gi, 'Baïlo');
  s = s.replace(/Ma\?mounatou/gi, 'Maïmounatou');
  s = s.replace(/Ka\?raba/gi, 'Kaïraba');
  s = s.replace(/Eug\?ne/gi, 'Eugène');
  s = s.replace(/Th\?r\?se/gi, 'Thérèse');
  s = s.replace(/th\?r\?se/gi, 'thérèse');
  s = s.replace(/Dj\?gb\?/gi, 'Djègbè');
  s = s.replace(/Nagnal\?n/gi, 'Nagnalen');

  // 2. Prénoms et patronymes récurrents
  s = s.replace(/P\?p\?/gi, 'Pépé');
  s = s.replace(/C\?c\?/gi, 'Cécé');
  s = s.replace(/S\?kou/gi, 'Sékou');
  s = s.replace(/Ny\?r\?k\?/gi, 'Nyéréké');
  s = s.replace(/K\?l\?tigui/gi, 'Kélétigui');
  s = s.replace(/Kel\?tigui/gi, 'Kélétigui');
  s = s.replace(/Fr\?deric/gi, 'Frédéric');
  s = s.replace(/Th\?ophile/gi, 'Théophile');
  s = s.replace(/Als\?ny/gi, 'Alsény');
  s = s.replace(/Dj\?nabou/gi, 'Djénabou');
  s = s.replace(/Sal\?matou/gi, 'Salématou');
  s = s.replace(/R\?seau/gi, 'Réseau');
  s = s.replace(/Ch\?rif/gi, 'Chérif');
  s = s.replace(/Diould\?/gi, 'Diouldé');
  s = s.replace(/Fod\?/gi, 'Fodé');
  s = s.replace(/Cir\?/gi, 'Ciré');
  s = s.replace(/Macir\?/gi, 'Maciré');
  s = s.replace(/Nial\?/gi, 'Nialé');
  s = s.replace(/Makal\?/gi, 'Makalé');
  s = s.replace(/Gueal\?/gi, 'Guealé');
  s = s.replace(/Fantagb\?/gi, 'Fantagbé');
  s = s.replace(/Madigb\?/gi, 'Madigbé');
  s = s.replace(/Kolyop\?/gi, 'Kolyopé');
  s = s.replace(/Y\?ro/gi, 'Yéro');
  s = s.replace(/Djel\?/gi, 'Djelí');

  // 3. Remplacement générique pour tout point d'interrogation au sein d'un mot
  s = s.replace(/([a-zA-ZÀ-ÿ])\?([a-zA-ZÀ-ÿ])/g, (m, a, b) => a + 'é' + b);
  s = s.replace(/([a-zA-ZÀ-ÿ])\?(?=\s|$|[0-9,\.])/g, (m, a) => a + 'é');

  return s;
};

/**
 * Récupération des utilisateurs Active Directory
 */
const getLdapUsers = async (searchQuery = '') => {
  const config = await LdapConfig.findOne({ where: { is_active: true } });
  if (!config) throw new Error("Aucune configuration LDAP active.");

  let filter = '(&(objectCategory=person)(objectClass=user))';
  if (searchQuery && searchQuery.trim()) {
    const q = searchQuery.trim().replace(/[*()\\/]/g, '');
    filter = `(&(objectCategory=person)(objectClass=user)(|(sAMAccountName=*${q}*)(cn=*${q}*)(mail=*${q}*)(displayName=*${q}*)(employeeID=*${q}*)))`;
  }

  const entries = await searchLdap(config, filter, [
    'cn',
    'sAMAccountName',
    'mail',
    'givenName',
    'sn',
    'userPrincipalName',
    'employeeID',
    'employeeNumber',
    'description',
    'department',
    'distinguishedName',
    'userAccountControl',
    'lockoutTime'
  ]);

  return entries.map(e => {
    const getAttr = (name) => {
      if (!e.attributes || !Array.isArray(e.attributes)) return '';
      const attr = e.attributes.find(a => (a.type || '').toLowerCase() === name.toLowerCase());
      return attr && attr.values && attr.values[0] ? attr.values[0] : '';
    };

    const uac = parseInt(getAttr('userAccountControl'), 10) || 0;
    const isAccountDisabled = Boolean(uac & 2);
    const lockout = parseInt(getAttr('lockoutTime'), 10) || 0;
    const isLocked = lockout > 0;

    const id = getAttr('sAMAccountName') || getAttr('cn');
    const isProtected = isSystemOrProtectedAccount(id);

    const rawName = getAttr('cn') || `${getAttr('givenName')} ${getAttr('sn')}`.trim();
    const cleanName = cleanAdName(rawName);

    return {
      identifier: id,
      name: cleanName,
      raw_name: rawName,
      email: getAttr('mail') || getAttr('userPrincipalName'),
      matricule: getAttr('employeeID') || getAttr('employeeNumber') || getAttr('description'),
      first_name: cleanAdName(getAttr('givenName') || ''),
      last_name: cleanAdName(getAttr('sn') || ''),
      department: cleanAdName(getAttr('department') || ''),
      dn: getAttr('distinguishedName') || e.objectName || '',
      is_disabled: isAccountDisabled,
      is_locked: isLocked,
      is_protected: isProtected
    };
  });
};

/**
 * Réinitialisation du mot de passe d'un utilisateur Active Directory
 * Utilise l'attribut unicodePwd encodé en UTF-16LE avec guillemets.
 * Déverrouille également le compte (lockoutTime: 0).
 */
const resetAdUserPassword = async ({
  identifierOrDn,
  newPassword,
  unlockAccount = true,
  passwordNeverExpires = false,
  mustChangeAtNextLogon = false,
  accountExpiresInDays = null
}) => {
  if (!identifierOrDn) {
    throw new Error("L'identifiant ou le DN de l'utilisateur est requis.");
  }
  if (isSystemOrProtectedAccount(identifierOrDn)) {
    throw new Error("Compte système protégé — modification interdite via la console Wi-Fi.");
  }
  if (!newPassword || newPassword.length < 6) {
    throw new Error("Le nouveau mot de passe doit comporter au moins 6 caractères.");
  }

  const config = await LdapConfig.findOne({ where: { is_active: true } });
  if (!config) throw new Error("Aucune configuration Active Directory active.");

  // Recherche des attributs actuels du compte (UAC, DN, mail, etc.)
  let targetDn = identifierOrDn;
  let targetEmail = '';
  let targetFullName = '';
  let sAMAccountName = identifierOrDn;
  let currentUac = 512;

  const isDn = identifierOrDn.toLowerCase().includes('dc=');
  const searchFilter = isDn
    ? `(distinguishedName=${identifierOrDn})`
    : `(&(objectCategory=person)(objectClass=user)(|(sAMAccountName=${identifierOrDn.replace(/[*()\\/]/g, '')})(mail=${identifierOrDn.replace(/[*()\\/]/g, '')})(userPrincipalName=${identifierOrDn.replace(/[*()\\/]/g, '')})))`;

  const users = await searchLdap(config, searchFilter, [
    'distinguishedName',
    'mail',
    'userPrincipalName',
    'cn',
    'sAMAccountName',
    'userAccountControl',
    'accountExpires'
  ]);

  if (users && users.length > 0) {
    const firstEntry = users[0];
    const getVal = (name) => {
      const a = (firstEntry.attributes || []).find(x => (x.type || '').toLowerCase() === name.toLowerCase());
      return a && a.values && a.values[0] ? a.values[0] : '';
    };

    targetDn = getVal('distinguishedName') || firstEntry.objectName || targetDn;
    targetEmail = getVal('mail') || getVal('userPrincipalName');
    targetFullName = getVal('cn');
    sAMAccountName = getVal('sAMAccountName') || identifierOrDn;
    if (getVal('userAccountControl')) {
      currentUac = parseInt(getVal('userAccountControl'), 10) || 512;
    }
  } else if (!isDn) {
    throw new Error(`Utilisateur "${identifierOrDn}" introuvable dans l'annuaire Active Directory.`);
  }

  if (!targetDn) {
    throw new Error("Impossible de résoudre le Distinguished Name (DN) de l'utilisateur.");
  }

  // Encodage unicodePwd spécifique à Active Directory : UTF-16LE entouré de guillemets
  const encodedPassword = Buffer.from(`"${newPassword}"`, 'utf16le');

  const client = await createLdapClient(config);

  return new Promise((resolve, reject) => {
    const changes = [
      new ldap.Change({
        operation: 'replace',
        modification: new ldap.Attribute({
          type: 'unicodePwd',
          values: [encodedPassword]
        })
      })
    ];

    // 1. Déverrouillage optionnel ou systématique du compte
    if (unlockAccount) {
      changes.push(
        new ldap.Change({
          operation: 'replace',
          modification: new ldap.Attribute({
            type: 'lockoutTime',
            values: ['0']
          })
        })
      );
    }

    // 2. Gestion "Le mot de passe n'expire jamais" via userAccountControl (flag 0x10000 = 65536)
    const DONT_EXPIRE_PASSWORD = 0x10000;
    let targetUac = currentUac;

    if (passwordNeverExpires) {
      targetUac = currentUac | DONT_EXPIRE_PASSWORD;
    } else {
      targetUac = currentUac & ~DONT_EXPIRE_PASSWORD;
    }

    if (targetUac !== currentUac) {
      changes.push(
        new ldap.Change({
          operation: 'replace',
          modification: new ldap.Attribute({
            type: 'userAccountControl',
            values: [String(targetUac)]
          })
        })
      );
    }

    // 3. Expiration et renouvellement immédiat (pwdLastSet)
    // Si passwordNeverExpires est actif, Active Directory rejette pwdLastSet: 0
    const shouldForceChange = mustChangeAtNextLogon && !passwordNeverExpires;
    changes.push(
      new ldap.Change({
        operation: 'replace',
        modification: new ldap.Attribute({
          type: 'pwdLastSet',
          values: [shouldForceChange ? '0' : '-1']
        })
      })
    );

    // 4. Durée de validité du compte en jours (accountExpires)
    if (accountExpiresInDays !== undefined && accountExpiresInDays !== null && accountExpiresInDays !== '') {
      const days = parseInt(accountExpiresInDays, 10);
      let accountExpiresVal = '0'; // 0 = n'expire jamais dans Active Directory
      if (days > 0) {
        const expDate = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
        expDate.setHours(23, 59, 59, 999);
        const fileTime = (BigInt(expDate.getTime()) + 11644473600000n) * 10000n;
        accountExpiresVal = fileTime.toString();
      }
      changes.push(
        new ldap.Change({
          operation: 'replace',
          modification: new ldap.Attribute({
            type: 'accountExpires',
            values: [accountExpiresVal]
          })
        })
      );
    }

    client.modify(targetDn, changes, (err) => {
      client.unbind();
      if (err) {
        const friendly = formatLdapErrorMessage(err);
        return reject(new Error(friendly));
      }

      resolve({
        success: true,
        dn: targetDn,
        identifier: sAMAccountName,
        email: targetEmail,
        fullName: cleanAdName(targetFullName),
        message: "Mot de passe réinitialisé avec succès dans Active Directory."
      });
    });
  });
};

/**
 * Récupération des groupes AD
 */
const getLdapGroups = async () => {
  const config = await LdapConfig.findOne({ where: { is_active: true } });
  if (!config) throw new Error("Aucune configuration LDAP active.");
  const filter = '(objectClass=group)';
  const entries = await searchLdap(config, filter, ['cn', 'sAMAccountName', 'description', 'distinguishedName']);

  return entries.map(e => {
    const getAttr = (name) => {
      if (!e.attributes || !Array.isArray(e.attributes)) return '';
      const attr = e.attributes.find(a => (a.type || '').toLowerCase() === name.toLowerCase());
      return attr && attr.values && attr.values[0] ? attr.values[0] : '';
    };
    return {
      identifier: getAttr('sAMAccountName') || getAttr('cn'),
      name: cleanAdName(getAttr('cn')),
      description: cleanAdName(getAttr('description')),
      dn: getAttr('distinguishedName') || e.objectName || ''
    };
  });
};

/**
 * Récupération des OUs et Containers
 */
const getLdapOUs = async () => {
  const config = await LdapConfig.findOne({ where: { is_active: true } });
  if (!config) throw new Error("Aucune configuration LDAP active.");
  const filter = '(|(objectClass=organizationalUnit)(objectClass=container)(objectCategory=builtinDomain))';
  try {
    const entries = await searchLdap(config, filter, ['ou', 'cn', 'name', 'distinguishedName', 'description']);
    return entries.map(e => {
      const getAttr = (name) => {
        const attr = e.attributes.find(a => a.type === name);
        return attr ? attr.values[0] : '';
      };
      return {
        name: cleanAdName(getAttr('ou') || getAttr('name') || getAttr('cn')),
        dn: getAttr('distinguishedName') || e.objectName || '',
        type: getAttr('ou') ? 'OU' : 'CONTAINER',
        description: cleanAdName(getAttr('description'))
      };
    });
  } catch (err) {
    console.warn("AD OUs search bypassed:", err.message);
    return [];
  }
};

module.exports = {
  authenticateLdap,
  testLdapConnection,
  formatLdapErrorMessage,
  getLdapUsers,
  getLdapGroups,
  getLdapOUs,
  resetAdUserPassword,
  getLdapUrl,
  cleanAdName,
  PROTECTED_ACCOUNTS,
  isSystemOrProtectedAccount
};
