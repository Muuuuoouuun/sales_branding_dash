import React from "react";
import clsx from "clsx";
import styles from "./Card.module.css";

interface CardProps {
    children: React.ReactNode;
    className?: string;
    title?: string;
    action?: React.ReactNode;
}

export default function Card({ children, className, title, action }: CardProps) {
    return (
        <div className={clsx(styles.card, "glass", className)}>
            {(title || action) && (
                <div className={styles.header}>
                    {title && <h3 className={styles.title}>{title}</h3>}
                    {action && <div>{action}</div>}
                </div>
            )}
            {children}
        </div>
    );
}
