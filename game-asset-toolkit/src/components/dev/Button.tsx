"use client";

import type { ButtonHTMLAttributes } from "react";
import s from "./dev.module.css";

export function Button({ variant = "secondary", className = "", type = "button", ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "ghost" }) {
  return <button type={type} className={`${s.button} ${variant === "primary" ? s.primary : variant === "ghost" ? s.ghost : ""} ${className}`} {...props} />;
}
