import Link from "next/link";
import { ArrowLeft, Plane } from "lucide-react";

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-[#F8FAFC] selection:bg-blue-600 selection:text-white">
      <nav className="bg-white border-b border-slate-200 h-20 flex items-center px-6 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto w-full flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-slate-500 hover:text-blue-600 transition-colors font-bold text-sm touch-manipulation">
            <ArrowLeft className="w-4 h-4" /> <span className="hidden sm:inline">Back to Home</span><span className="sm:hidden">Back</span>
          </Link>
          <div className="flex items-center gap-2 text-blue-600 font-black tracking-tighter text-lg sm:text-xl uppercase">
            <Plane className="w-5 h-5 rotate-45" /> AEROPARK<span className="text-slate-900">DIRECT</span>
          </div>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-6 py-12 md:py-20">
        <h1 className="text-3xl md:text-5xl font-black text-slate-900 mb-4 uppercase tracking-tight">Terms & Conditions.</h1>
        <p className="text-slate-500 font-medium mb-12">Effective from: January 1, {new Date().getFullYear()}</p>

        <div className="prose prose-slate max-w-none prose-headings:font-black prose-headings:uppercase prose-headings:tracking-tight space-y-10 text-slate-600 text-sm md:text-base leading-relaxed">
          
          {/* SECTION A: OVERVIEW */}
          <div className="bg-slate-100 p-6 md:p-8 rounded-2xl border border-slate-200 space-y-6">
            <h2 className="text-xl text-slate-900 m-0">Terms and Conditions of Booking</h2>
            
            <div>
              <h3 className="text-sm font-bold text-slate-900 mt-0 mb-2">1. Acceptance of Terms</h3>
              <p className="m-0">These terms apply to all bookings for Products made through the Website. Please read them carefully before making a booking, as they explain how you can make, amend, or cancel a booking. By making a booking, you confirm that you accept these terms.</p>
            </div>
            
            <div>
              <h3 className="text-sm font-bold text-slate-900 mt-0 mb-2">2. Our Role as Booking Agent</h3>
              <p className="m-0">We act as an intermediary booking agent on behalf of third-party Product Providers who supply the Products advertised on the Website. This means that a contract for the supply of the Product is formed between you and the relevant Product Provider.</p>
            </div>

            <div>
              <h3 className="text-sm font-bold text-slate-900 mt-0 mb-2">3. Product Provider Responsibility and Claims</h3>
              <p className="m-0">The Product Provider is responsible for supplying and delivering the Product to you. Any issues, complaints, or claims relating to the Product (including its quality, delivery, or performance) should be directed to the relevant Product Provider and will be subject to their terms and conditions. However, we will provide reasonable assistance to you in contacting the Product Provider where appropriate.</p>
            </div>

            <div>
              <h3 className="text-sm font-bold text-slate-900 mt-0 mb-2">4. Your Consumer Rights</h3>
              <p className="m-0">Nothing in these terms affects your statutory rights as a consumer. For example, under the Consumer Contracts Regulations 2013, you may have rights to cancel certain bookings made online, and under the Consumer Rights Act 2015, Products must be as described, of satisfactory quality, and fit for purpose.</p>
            </div>

            <div>
              <h3 className="text-sm font-bold text-slate-900 mt-0 mb-2">5. Privacy and Cookies Policies</h3>
              <p className="m-0">When you make a booking through the Website, your personal data will be handled in accordance with our privacy policy and cookies policy.</p>
            </div>

            <div>
              <h3 className="text-sm font-bold text-slate-900 mt-0 mb-2">6. Changes to These Terms</h3>
              <p className="m-0">We may update these terms from time to time. Any changes will not affect bookings already made, and the terms that apply to your booking will be those in force at the time you placed your booking. We recommend that you review these terms before each booking.</p>
            </div>

            <div>
              <h3 className="text-sm font-bold text-slate-900 mt-0 mb-2">7. Important Information</h3>
              <p className="m-0">Some provisions in these terms may have legal consequences for you. You should read all terms carefully and ensure that you understand them before making a booking.</p>
            </div>
          </div>

          <hr className="border-slate-200" />

          {/* SECTION B: DETAILED TERMS */}
          <section>
            <h2 className="text-xl text-slate-900 mb-4 border-l-4 border-blue-600 pl-4">1. Status of the Website and Agency Capacity</h2>
            <p>1.1 The Website operates strictly in the capacity of a booking agent acting on behalf of independent third-party suppliers (“Product Providers”) in respect of the Products made available for booking.</p>
            <p>1.2 By making a booking through the Website, you acknowledge and agree that:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li>The Company does not itself supply, perform, or deliver the Products;</li>
              <li>The contractual obligation for the provision of the Products rests solely with the relevant Product Provider; and</li>
              <li>The Company shall bear no responsibility or liability for the performance, suitability, or fulfilment of the Products.</li>
            </ul>
            <p>1.3 The Company’s obligations are strictly limited to the facilitation and administrative processing of bookings.</p>
          </section>

          <section>
            <h2 className="text-xl text-slate-900 mb-4 border-l-4 border-blue-600 pl-4">2. Formation of Contract and Role of Product Providers</h2>
            <p>2.1 All Products advertised via the Website are supplied by independent third-party Product Providers.</p>
            <p>2.2 Upon confirmation of a booking, a legally binding contract is formed directly between the customer and the relevant Product Provider, governed by the Product Provider’s own terms and conditions (“Product Provider Terms”).</p>
            <p>2.3 The customer acknowledges and agree that:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li>The Company is not a party to the contract for the supply of the Products;</li>
              <li>The Product Provider Terms govern the provision, performance, and fulfilment of the Products; and</li>
              <li>Any claims relating to the performance or delivery of the Products must be directed solely to the Product Provider.</li>
            </ul>
            <p>2.4 The Company may retain a portion of the booking price as a service fee, remitting the balance to the Product Provider.</p>
          </section>

          <section>
            <h2 className="text-xl text-slate-900 mb-4 border-l-4 border-blue-600 pl-4">3. Pricing and Payment</h2>
            <p>3.1 Full payment is required at the time of booking via the payment methods made available on the Website.</p>
            <p>3.2 All prices are displayed in the relevant currency and include applicable taxes unless otherwise stated.</p>
            <p>3.3 The Company reserves the right to decline any booking where payment is unsuccessful, suspected to be fraudulent, or made without proper authorisation.</p>
            <p>3.4 Additional charges, including foreign exchange fees or conversion costs, may be applied by financial institutions and are outside the control of the Company.</p>
            <p>3.5 VAT invoices may only be issued where the relevant Product Provider supplies sufficient VAT registration information.</p>
          </section>

          <section>
            <h2 className="text-xl text-slate-900 mb-4 border-l-4 border-blue-600 pl-4">4. Amendments to Bookings</h2>
            <p>4.1 Certain booking types, including but not limited to “NON-FLEX”, “SUPERSAVER”, and “EARLY” products, are strictly non-amendable.</p>
            <p>4.2 Where amendments are permitted, they shall be subject to:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li>A minimum notice period of forty-eight (48) hours prior to the scheduled use of the Product; and</li>
              <li>Availability and acceptance by the relevant Product Provider.</li>
            </ul>
            <p>4.3 Amendments shall only take effect upon written confirmation issued by the Company or the Product Provider.</p>
            <p>4.4 The Company shall not be liable where an amendment request cannot be fulfilled by the Product Provider.</p>
          </section>

          <section>
            <h2 className="text-xl text-slate-900 mb-4 border-l-4 border-blue-600 pl-4">5. Cancellations and Refunds</h2>
            <p>5.1 Certain Products are non-cancellable and non-refundable, as specified at the time of booking.</p>
            <p>5.2 Where cancellation is permitted, it must be requested no less than forty-eight (48) hours prior to the scheduled Product usage date.</p>
            <p>5.3 Refunds, where applicable, shall be processed as follows:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li>Bookings with cancellation cover: refund less booking fee and cancellation cover cost;</li>
              <li>Bookings without cancellation cover: refund less applicable cancellation fee and booking fee.</li>
            </ul>
            <p>5.4 No refunds shall be issued in respect of:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li>Expired bookings;</li>
              <li>Partially used Products; or</li>
              <li>Non-compliance with booking conditions.</li>
            </ul>
            <p>5.5 Cancellation requests must be submitted via authorised communication channels only and shall not be valid if made directly to the Product Provider.</p>
          </section>

          <section>
            <h2 className="text-xl text-slate-900 mb-4 border-l-4 border-blue-600 pl-4">6. Complaints and Dispute Resolution</h2>
            <p>6.1 Any issues relating to Website functionality must be raised directly with the Company.</p>
            <p>6.2 Any issues relating to the Product must initially be raised with the Product Provider at the time of or immediately following use.</p>
            <p>6.3 Where a complaint remains unresolved, it must be escalated to the Company within seven (7) days.</p>
            <p>6.4 The Company reserves the right to deem any complaint closed if not notified within fourteen (14) days of Product use.</p>
          </section>

          <section>
            <h2 className="text-xl text-slate-900 mb-4 border-l-4 border-blue-600 pl-4">7. General Provisions</h2>
            <p>7.1 If any provision of these Terms is held to be invalid or unenforceable, such provision shall be severed and the remaining provisions shall remain in full force and effect.</p>
            <p>7.2 These Terms, together with the Privacy Policy and Cookies Policy, constitute the entire agreement between the parties.</p>
            <p>7.3 No waiver of any right or remedy shall be effective unless made in writing.</p>
            <p>7.4 These Terms shall be governed by and construed in accordance with the laws of England and Wales.</p>
            <p>7.5 The courts of England and Wales shall have jurisdiction, without prejudice to any statutory rights applicable to consumers in other UK jurisdictions.</p>
          </section>

          <hr className="border-slate-200" />

          {/* SECTION C: REVIEW POLICY */}
          <div className="bg-slate-900 text-slate-300 p-6 md:p-8 rounded-2xl shadow-xl mt-12 space-y-6">
            <h2 className="text-2xl text-white m-0">Review and Rating Policy</h2>
            <p className="text-sm text-slate-400">Last update: 27 April 2026</p>

            <div>
              <h3 className="text-base font-bold text-white mt-0 mb-2">1. Introduction</h3>
              <p className="m-0 text-sm">1.1 The Company is committed to ensuring that all customer reviews published in connection with its services accurately reflect genuine consumer experiences.<br/>
              1.2 This Policy sets out the principles governing the collection, moderation, publication, and reporting of customer reviews and ratings.</p>
            </div>

            <div>
              <h3 className="text-base font-bold text-white mt-0 mb-2">2. Collection and Publication of Reviews</h3>
              <p className="m-0 text-sm">2.1 Customer reviews are collected and displayed through independent third-party review platforms, including but not limited to Trustpilot.<br/>
              2.2 The Company does not operate a proprietary review system and relies upon the integrity and moderation systems of such third-party providers.<br/>
              2.3 Reviews displayed on or in connection with the Website originate from these third-party platforms and are subject to their respective terms, policies, and moderation procedures.</p>
            </div>

            <div>
              <h3 className="text-base font-bold text-white mt-0 mb-2">3. Authenticity and Prohibited Conduct</h3>
              <p className="text-sm">3.1 The Company encourages all customers to submit honest, accurate, and genuine reviews based solely on their personal experience of the relevant service.<br/>
              3.2 The submission of false, misleading, fraudulent, or otherwise non-genuine reviews is strictly prohibited.<br/>
              3.3 For the purposes of this Policy, a “fake review” shall mean any review purporting to represent a genuine consumer experience which is not, in fact, based on a bona fide experience of the reviewer.<br/>
              3.4 Where the Company reasonably believes or is notified that a review is fake or otherwise in breach of applicable platform rules, it reserves the right to:</p>
              <ul className="list-disc pl-5 mt-2 text-sm">
                <li>Report the review to the relevant third-party platform; and/or</li>
                <li>Request investigation and removal by the relevant platform; and/or</li>
                <li>Request removal from any Website display where applicable.</li>
              </ul>
            </div>

            <div>
              <h3 className="text-base font-bold text-white mt-0 mb-2">4. Integrity and Non-Manipulation of Reviews</h3>
              <p className="m-0 text-sm">4.1 The Company does not engage in the selective publication, suppression, or manipulation of customer reviews or ratings.<br/>
              4.2 The Company does not offer incentives, rewards, or other benefits in exchange for the submission of reviews.<br/>
              4.3 In the event that this position changes in the future, any incentivised reviews will be clearly and prominently disclosed in accordance with applicable laws, regulations, and relevant platform guidelines, such that consumers are made aware of the incentivised nature of such reviews.</p>
            </div>

            <div>
              <h3 className="text-base font-bold text-white mt-0 mb-2">5. Reporting Concerns</h3>
              <p className="text-sm">5.1 While reasonable efforts are made to ensure the authenticity of reviews, concerns regarding potential breaches of this Policy may be reported by users.<br/>
              5.2 If you wish to report a review, you may do so by:</p>
              <ul className="list-disc pl-5 mt-2 text-sm">
                <li>Using the reporting tools provided by the relevant platform (e.g., Trustpilot via the “Flag review” function on the relevant review page).</li>
                <li>Contacting the Company via the designated contact form available on the Website.</li>
              </ul>
              <p className="mt-2 text-sm">5.3 All reports submitted to third-party platforms are assessed and determined solely by the relevant platform in accordance with its internal policies and procedures. The Company does not exercise control over such determinations.</p>
            </div>

            <div>
              <h3 className="text-base font-bold text-white mt-0 mb-2">6. Policy Updates</h3>
              <p className="m-0 text-sm">6.1 The Company reserves the right to amend, update, or revise this Policy at any time to reflect changes in applicable law, regulatory guidance, or third-party platform requirements.<br/>
              6.2 The most current version of this Policy shall be published on the Website and shall supersede all prior versions.</p>
            </div>
          </div>
          
        </div>
      </div>
    </main>
  );
}