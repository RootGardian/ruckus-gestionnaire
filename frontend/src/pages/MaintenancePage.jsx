import React from 'react';
import { useLocation, useSearchParams, useNavigate, Link } from 'react-router-dom';
import { Wrench, ArrowLeft, LifeBuoy } from 'lucide-react';
import hubLogo from '../assets/bcrg-hub-svg.svg.png';
import './MaintenancePage.css';

const MaintenancePage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  // Nom et informations de l'application depuis les paramètres d'URL ou l'état de navigation
  const appName =
    searchParams.get('appName') ||
    searchParams.get('app') ||
    location.state?.app?.name ||
    'Cette application';

  const appDescription =
    searchParams.get('desc') ||
    location.state?.app?.description ||
    null;

  const handleBackToHub = () => {
    navigate('/dashboard');
  };

  return (
    <div className="maintenance-page-wrapper">
      {/* Barre d'en-tête blanche et sobre assortie au Hub */}
      <header className="maintenance-header">
        <Link to="/dashboard" className="maintenance-brand">
          <img src={hubLogo} alt="Logo BCRG Hub" className="maintenance-logo" />
          <div className="maintenance-brand-text">
            <span className="maintenance-brand-title">Banque Centrale de la République de Guinée</span>
            <span className="maintenance-brand-sub">Portail Hub BCRG &bull; Services Etudes et Développement</span>
          </div>
        </Link>
      </header>

      {/* Contenu principal */}
      <main className="maintenance-content-container">
        <div className="maintenance-card">
          {/* Icône sobre aux couleurs de l'application */}
          <div className="maintenance-icon-box">
            <Wrench size={32} />
          </div>

          {/* Badge statut épuré style pilule Hub */}
          <div className="maintenance-pill">
            <span className="maintenance-pulse-dot"></span>
            Maintenance Planifiée &bull; Service Indisponible
          </div>

          {/* Titre dynamique */}
          <h1 className="maintenance-title">
            <span className="maintenance-app-highlight">{appName}</span> est temporairement en maintenance
          </h1>

          {/* Description */}
          <p className="maintenance-desc">
            {appDescription ? (
              <>
                <strong>{appName}</strong> ({appDescription}) fait actuellement l'objet d'une intervention
                technique par la Direction des Systèmes d'Information (DSI).
              </>
            ) : (
              <>
                Ce service fait l'objet d'une opération de maintenance préventive et d'optimisation
                afin de garantir sa haute disponibilité et sa sécurité.
              </>
            )}
            <br />
            L'accès sera rétabli dès la finalisation de la maintenance.
          </p>

          {/* Boutons d'action */}
          <div className="maintenance-actions">
            <button onClick={handleBackToHub} className="btn-maint-primary">
              <ArrowLeft size={18} />
              Retourner au Tableau de Bord BCRG
            </button>
          </div>

          {/* Support */}
          <div className="maintenance-support-note">
            <LifeBuoy size={16} />
            <span>
              Besoin d'une assistance urgente ? Contactez le SED de la DSI.
            </span>
          </div>
        </div>
      </main>

      {/* Footer institutionnel */}
      <footer className="maintenance-footer">
        &copy; {new Date().getFullYear()} Banque Centrale de la République de Guinée (BCRG). Tous droits réservés.
      </footer>
    </div>
  );
};

export default MaintenancePage;
