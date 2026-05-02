import React from "react";

export interface CardProps {
  title: string;
  description?: string;
  image?: string;
  footer?: React.ReactNode;
  actions?: React.ReactNode;
  variant?: "default" | "bordered" | "elevated";
  onClick?: () => void;
  children?: React.ReactNode;
}

const variantStyles = {
  default: "bg-white border border-gray-200",
  bordered: "bg-white border-2 border-gray-300",
  elevated: "bg-white shadow-lg border-0",
};

export function Card({
  title,
  description,
  image,
  footer,
  actions,
  variant = "default",
  onClick,
  children,
}: CardProps) {
  return (
    <div
      onClick={onClick}
      className={[
        "rounded-xl overflow-hidden transition-shadow",
        variantStyles[variant],
        onClick ? "cursor-pointer hover:shadow-md" : "",
      ].join(" ")}
    >
      {image && (
        <img src={image} alt={title} className="w-full h-48 object-cover" />
      )}
      <div className="p-5">
        <h3 className="text-base font-semibold text-gray-900">{title}</h3>
        {description && (
          <p className="mt-1 text-sm text-gray-500">{description}</p>
        )}
        {children && <div className="mt-3">{children}</div>}
        {actions && <div className="mt-4 flex items-center gap-2">{actions}</div>}
      </div>
      {footer && (
        <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 text-sm text-gray-500">
          {footer}
        </div>
      )}
    </div>
  );
}
