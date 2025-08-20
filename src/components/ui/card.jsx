import React from 'react';

export function Card({ className = '', ...props }) {
  return <div className={`rounded-lg border bg-white ${className}`} {...props} />;
}

export function CardHeader({ className = '', ...props }) {
  return <div className={`border-b p-4 ${className}`} {...props} />;
}

export function CardTitle({ className = '', ...props }) {
  return <h2 className={`font-semibold ${className}`} {...props} />;
}

export function CardContent({ className = '', ...props }) {
  return <div className={`p-4 ${className}`} {...props} />;
}
