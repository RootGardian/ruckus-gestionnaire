import React from 'react';
import './StatusBadge.css';

export const StatusBadge = ({
  status = 'active', // 'active' | 'disabled' | 'locked' | 'warning' | 'info'
  children
}) => {
  return (
    <span className={`bcrg-status-badge ${status}`}>
      <span className="bcrg-badge-dot" />
      <span>{children}</span>
    </span>
  );
};

export default StatusBadge;
