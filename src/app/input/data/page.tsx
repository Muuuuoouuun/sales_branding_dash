"use client";

import React, { useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import Card from "@/components/Card";
import styles from "./page.module.css";
import { Users, DollarSign, FileText, Send, CheckCircle } from "lucide-react";

type Status = "idle" | "submitting" | "success";

export default function InputDataPage() {
    // State management for interactions
    const [crmStatus, setCrmStatus] = useState<Status>("idle");
    const [salesStatus, setSalesStatus] = useState<Status>("idle");
    const [noteStatus, setNoteStatus] = useState<Status>("idle");

    const handleSubmit = (type: string, setStatus: Dispatch<SetStateAction<Status>>) => {
        setStatus("submitting");
        // Simulate API call
        setTimeout(() => {
            setStatus("success");
            setTimeout(() => setStatus("idle"), 2000);
        }, 1000);
    };

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <h1 className={styles.title}>Data Entry Hub</h1>
                <p className={styles.subtitle}>Manage CRM, Sales Metrics, and Strategic Notes</p>
            </header>

            <div className={styles.grid}>
                {/* CRM Section */}
                <Card title="New Lead Entry">
                    <div className={`${styles.sectionIcon} ${styles.crmIcon}`}>
                        <Users size={24} />
                    </div>
                    <form onSubmit={(e) => { e.preventDefault(); handleSubmit('crm', setCrmStatus); }}>
                        <div className={styles.formGroup}>
                            <label className={styles.label}>Client Name</label>
                            <input type="text" className={styles.input} placeholder="e.g. Acme Corp" required />
                        </div>
                        <div className={styles.formGroup}>
                            <label className={styles.label}>Industry</label>
                            <select className={styles.select}>
                                <option>Technology</option>
                                <option>Finance</option>
                                <option>Healthcare</option>
                                <option>Manufacturing</option>
                            </select>
                        </div>
                        <div className={styles.formGroup}>
                            <label className={styles.label}>Contact Person</label>
                            <input type="text" className={styles.input} placeholder="John Doe" />
                        </div>
                        <button type="submit" className={styles.submitBtn} disabled={crmStatus === "submitting"}>
                            {crmStatus === "success" ? <CheckCircle size={18} /> : <Send size={18} />}
                            {crmStatus === "success" ? "Saved!" : "Add Lead"}
                        </button>
                    </form>
                </Card>

                {/* Sales Section */}
                <Card title="Deal Pipeline Update">
                    <div className={`${styles.sectionIcon} ${styles.salesIcon}`}>
                        <DollarSign size={24} />
                    </div>
                    <form onSubmit={(e) => { e.preventDefault(); handleSubmit('sales', setSalesStatus); }}>
                        <div className={styles.formGroup}>
                            <label className={styles.label}>Deal Value (${typeof window !== 'undefined' && localStorage.getItem('app-currency') === 'USD' ? '$' : '¥'})</label>
                            <input type="number" className={styles.input} placeholder="50,000,000" required />
                        </div>
                        <div className={styles.formGroup}>
                            <label className={styles.label}>Stage</label>
                            <select className={styles.select}>
                                <option>Qualification</option>
                                <option>Proposal</option>
                                <option>Negotiation</option>
                                <option>Closed Won</option>
                            </select>
                        </div>
                        <div className={styles.formGroup}>
                            <label className={styles.label}>Probability (%)</label>
                            <input
                                type="range"
                                min="0"
                                max="100"
                                className={styles.range}
                                defaultValue="50"
                                onInput={(event: React.FormEvent<HTMLInputElement>) => {
                                    const output = event.currentTarget.nextElementSibling as HTMLOutputElement | null;
                                    if (output) {
                                        output.value = `${event.currentTarget.value}%`;
                                    }
                                }}
                            />
                            <output style={{ display: 'block', textAlign: 'right', fontSize: '0.8rem', color: 'var(--accent)' }}>50%</output>
                        </div>
                        <button type="submit" className={styles.submitBtn} disabled={salesStatus === "submitting"}>
                            {salesStatus === "success" ? <CheckCircle size={18} /> : <Send size={18} />}
                            {salesStatus === "success" ? "Updated!" : "Log Deal"}
                        </button>
                    </form>
                </Card>

                {/* Notes Section */}
                <Card title="Strategic Notes">
                    <div className={`${styles.sectionIcon} ${styles.noteIcon}`}>
                        <FileText size={24} />
                    </div>
                    <form onSubmit={(e) => { e.preventDefault(); handleSubmit('note', setNoteStatus); }}>
                        <div className={styles.formGroup}>
                            <label className={styles.label}>Title</label>
                            <input type="text" className={styles.input} placeholder="Weekly Review" required />
                        </div>
                        <div className={styles.formGroup}>
                            <label className={styles.label}>Content</label>
                            <textarea className={styles.textarea} placeholder="Key observations from the field..."></textarea>
                        </div>
                        <div className={styles.formGroup}>
                            <label className={styles.label}>Priority</label>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.8rem', cursor: 'pointer' }}>
                                    <input type="radio" name="priority" value="low" /> Low
                                </label>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.8rem', cursor: 'pointer' }}>
                                    <input type="radio" name="priority" value="medium" defaultChecked /> Medium
                                </label>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.8rem', cursor: 'pointer', color: 'var(--danger)' }}>
                                    <input type="radio" name="priority" value="high" /> High
                                </label>
                            </div>
                        </div>
                        <button type="submit" className={styles.submitBtn} disabled={noteStatus === "submitting"}>
                            {noteStatus === "success" ? <CheckCircle size={18} /> : <Send size={18} />}
                            {noteStatus === "success" ? "Saved!" : "Save Note"}
                        </button>
                    </form>
                </Card>
            </div>
        </div>
    );
}
