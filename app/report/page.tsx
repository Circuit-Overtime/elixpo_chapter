'use client';

import { type FormEvent, useState } from 'react';
import Footer from '@/app/components/Footer';
import Navbar from '@/app/components/Navbar';

export default function ReportAbusePage() {
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setMessage('');
    const form = new FormData(event.currentTarget);
    const response = await fetch('/api/abuse/reports', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(Object.fromEntries(form)),
    });
    const data = await response.json().catch(() => ({})) as { error?: string };
    setMessage(response.ok ? 'Report received. The link will be reviewed.' : data.error || 'Could not submit the report.');
    if (response.ok) event.currentTarget.reset();
    setSubmitting(false);
  }

  return (
    <div className="theme-light min-h-screen flex flex-col bg-white text-[#111]">
      <Navbar />
      <main className="flex-1 w-full max-w-xl mx-auto px-5 py-14">
        <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#c62828]">Trust and safety</p>
        <h1 className="text-4xl font-extrabold mt-2">Report a short link</h1>
        <p className="text-[#555] mt-3 mb-8">Report phishing, malware, spam, or impersonation. Include enough context for a reviewer to verify the problem.</p>
        <form onSubmit={submit} className="space-y-5 rounded-2xl border border-black/10 p-6">
          <Field label="Short code" name="code" placeholder="example: Ab12cd" required />
          <label className="block text-sm font-semibold">Reason
            <select name="reason" required className="mt-2 w-full rounded-lg border border-black/15 bg-white px-3 py-2 font-normal">
              <option value="phishing">Phishing</option><option value="malware">Malware</option>
              <option value="spam">Spam</option><option value="impersonation">Impersonation</option><option value="other">Other</option>
            </select>
          </label>
          <label className="block text-sm font-semibold">Details
            <textarea name="details" required minLength={10} maxLength={1000} rows={5} className="mt-2 w-full rounded-lg border border-black/15 px-3 py-2 font-normal" />
          </label>
          <Field label="Email (optional)" name="email" type="email" placeholder="you@example.com" />
          <button disabled={submitting} className="btn-accent w-full justify-center disabled:opacity-60">{submitting ? 'Submitting…' : 'Submit report'}</button>
          {message && <p role="status" className="text-sm text-[#555]">{message}</p>}
        </form>
      </main>
      <Footer />
    </div>
  );
}

function Field({ label, name, type = 'text', placeholder, required = false }: { label: string; name: string; type?: string; placeholder?: string; required?: boolean }) {
  return <label className="block text-sm font-semibold">{label}<input name={name} type={type} placeholder={placeholder} required={required} className="mt-2 w-full rounded-lg border border-black/15 px-3 py-2 font-normal" /></label>;
}
