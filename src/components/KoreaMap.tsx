"use client";

import React, { useState } from "react";
import styles from "./KoreaMap.module.css";
import clsx from "clsx";

interface Region {
    name: string;
    revenue: number;
    target: number;
    velocity: number;
    coordinates: [number, number];
    status: "good" | "warning" | "critical";
}

interface KoreaMapProps {
    data: Region[];
}

export default function KoreaMap({ data }: KoreaMapProps) {
    const [hoveredRegion, setHoveredRegion] = useState<Region | null>(null);

    // Simple relative coordinates for major cities on a 300x400 SVG canvas
    // These are conceptual positions for the "South Korea" shape
    const mapPath = "M120,60 L180,60 L200,90 L240,100 L240,240 L200,280 L140,290 L100,270 L80,200 L90,120 Z";
    // Note: Detailed map paths are complex. For this dashboard aesthetic, we can use 
    // either a simplified polygon or just plot points. 
    // Let's use a "Tech/Cyber" style grid with points for a modern look.

    return (
        <div className={styles.mapContainer}>
            <svg viewBox="0 0 300 350" className={styles.mapSvg}>
                {/* Background Grid Pattern */}
                <defs>
                    <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                        <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
                    </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#grid)" />

                {/* Simplified Korea Outline (Abstract) */}
                <path
                    d="M100,70 L160,50 L200,80 L230,120 L240,180 L250,230 L230,280 L180,310 L120,300 L90,260 L70,180 L80,120 Z"
                    fill="rgba(99, 102, 241, 0.05)"
                    stroke="rgba(99, 102, 241, 0.2)"
                    strokeWidth="2"
                />

                {/* Regional Points */}
                {data.map((region) => (
                    <g
                        key={region.name}
                        className={styles.regionGroup}
                        onMouseEnter={() => setHoveredRegion(region)}
                        onMouseLeave={() => setHoveredRegion(null)}
                    >
                        {/* Pulsing Effect for Critical Regions */}
                        {region.status === 'critical' && (
                            <circle cx={region.coordinates[0]} cy={region.coordinates[1]} r="15" className={styles.pulse} />
                        )}

                        <circle
                            cx={region.coordinates[0]}
                            cy={region.coordinates[1]}
                            r={region.name === "Seoul" ? 8 : 5}
                            className={clsx(styles.point, styles[region.status])}
                        />

                        <text
                            x={region.coordinates[0]}
                            y={region.coordinates[1] + 15}
                            textAnchor="middle"
                            className={styles.regionLabel}
                        >
                            {region.name}
                        </text>
                    </g>
                ))}
            </svg>

            {/* Tooltip Overlay */}
            {hoveredRegion && (
                <div
                    className={clsx("glass", styles.tooltip)}
                    style={{
                        left: hoveredRegion.coordinates[0] + 20,
                        top: hoveredRegion.coordinates[1] - 20
                    }}
                >
                    <h4 className={styles.tooltipTitle}>{hoveredRegion.name}</h4>
                    <div className={styles.tooltipRow}>
                        <span>Revenue</span>
                        <span className={styles.tooltipValue}>${hoveredRegion.revenue.toLocaleString()}</span>
                    </div>
                    <div className={styles.tooltipRow}>
                        <span>Velocity</span>
                        <span className={styles.tooltipValue}>{hoveredRegion.velocity}%</span>
                    </div>
                    <div className={styles.tooltipStatus}>
                        Status: <span className={styles[hoveredRegion.status]}>{hoveredRegion.status.toUpperCase()}</span>
                    </div>
                </div>
            )}
        </div>
    );
}
