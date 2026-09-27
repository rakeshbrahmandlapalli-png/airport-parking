"use client";

import SiteHeader from "@/components/site/SiteHeader";
import SiteFooter from "@/components/site/SiteFooter";
import { Mail, Phone, MapPin, CheckCircle2, Loader2 } from "lucide-react";
import { COMPANY } from "@/app/lib/company";
import { useState } from "react";

export default function ContactPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSent, setIsSent] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage("");

    const formData = new FormData(e.currentTarget);
    
    // Construct the payload for your updated API route
    const payload = {
      name: formData.get("name"),
      email: formData.get("email"),
      reference: formData.get("reference"),
      message: formData.get("message"),
    };

    try {
      const response = await fetch("/api/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setIsSent(true);
      } else {
        setErrorMessage(data.debug_msg || "Your message could not be sent. Please try again, or email us directly.");
      }
    } catch (err) {
      setErrorMessage("Network error. Please check your connection.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const field = "w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-base text-slate-900 placeholder:text-slate-400 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20";
  const label = "block text-sm font-medium text-slate-700 mb-1.5";

  return (
    <>
      <SiteHeader />
      <main className="bg-slate-50 text-slate-900 font-sans">
        <div className="max-w-6xl mx-auto px-4 md:px-6 py-12 md:py-20">
          <div className="max-w-2xl mb-10 md:mb-14">
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Contact us</h1>
            <p className="mt-3 text-base md:text-lg text-slate-600 leading-relaxed">
              Questions about a Luton or Heathrow booking, or about parking with us? Call, email or send us a message.
            </p>
          </div>

          <div className="grid gap-8 lg:grid-cols-12 items-start">
            <div className="lg:col-span-4 space-y-4">
              <div className="rounded-xl border border-slate-200 bg-white p-5">
                <div className="flex items-center gap-3 text-sm font-medium text-slate-500">
                  <Phone className="w-4 h-4" aria-hidden="true" /> Phone
                </div>
                <a href={COMPANY.phoneHref} className="mt-2 block text-lg font-semibold text-slate-900 hover:text-blue-700">
                  {COMPANY.phoneDisplay}
                </a>
                <p className="mt-1 text-sm text-slate-500">Call or text.</p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-5">
                <div className="flex items-center gap-3 text-sm font-medium text-slate-500">
                  <Mail className="w-4 h-4" aria-hidden="true" /> Email
                </div>
                <a href={`mailto:${COMPANY.email}`} className="mt-2 block text-lg font-semibold text-slate-900 hover:text-blue-700 break-all">
                  {COMPANY.email}
                </a>
              </div>

              {/* Registered office. It is a legal address, not somewhere a customer
                  should drive to — the operation runs out of Luton and Heathrow.
                  It matches the Privacy and Terms pages and the LocalBusiness
                  schema on the homepage. */}
              <div className="rounded-xl border border-slate-200 bg-white p-5">
                <div className="flex items-center gap-3 text-sm font-medium text-slate-500">
                  <MapPin className="w-4 h-4" aria-hidden="true" /> Registered office
                </div>
                <address className="mt-2 not-italic text-base text-slate-900 leading-relaxed">
                  66 Paul Street<br />
                  London EC2A 4NA<br />
                  United Kingdom
                </address>
                <p className="mt-2 text-sm text-slate-500">
                  {COMPANY.name}, company no. {COMPANY.number}
                </p>
              </div>
            </div>

            <div className="lg:col-span-8 rounded-xl border border-slate-200 bg-white p-6 md:p-8">
              {isSent ? (
                <div className="py-12 text-center">
                  <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" aria-hidden="true" />
                  <h2 className="mt-4 text-xl font-semibold">Thanks, your message has been sent</h2>
                  <p className="mt-2 text-slate-600">We&apos;ll reply to the email address you gave us.</p>
                  <button
                    type="button"
                    onClick={() => setIsSent(false)}
                    className="mt-6 text-sm font-medium text-blue-700 hover:underline underline-offset-4"
                  >
                    Send another message
                  </button>
                </div>
              ) : (
                <>
                  <h2 className="text-xl font-semibold">Send us a message</h2>
                  <p className="mt-1 text-sm text-slate-500">If it&apos;s about an existing booking, include your booking reference.</p>

                  <form onSubmit={handleSubmit} className="mt-6 space-y-5">
                    <div className="grid gap-5 sm:grid-cols-2">
                      <div>
                        <label htmlFor="contact-name" className={label}>Name</label>
                        <input id="contact-name" name="name" type="text" required autoComplete="name" className={field} />
                      </div>
                      <div>
                        <label htmlFor="contact-email" className={label}>Email</label>
                        <input id="contact-email" name="email" type="email" required autoComplete="email" className={field} />
                      </div>
                    </div>

                    <div>
                      <label htmlFor="contact-reference" className={label}>
                        Booking reference <span className="font-normal text-slate-400">(optional)</span>
                      </label>
                      <input id="contact-reference" name="reference" type="text" placeholder="e.g. APD-99210" className={field} />
                    </div>

                    <div>
                      <label htmlFor="contact-message" className={label}>Message</label>
                      <textarea id="contact-message" name="message" rows={5} required className={`${field} resize-y`} />
                    </div>

                    {errorMessage && (
                      <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                        {errorMessage}
                      </p>
                    )}

                    <button
                      disabled={isSubmitting}
                      type="submit"
                      className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-6 py-3 text-base font-semibold text-white hover:bg-blue-700 disabled:bg-slate-400"
                    >
                      {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />}
                      {isSubmitting ? "Sending…" : "Send message"}
                    </button>
                  </form>
                </>
              )}
            </div>
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
