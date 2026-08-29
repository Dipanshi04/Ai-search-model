import LegalPage from '../components/LegalPage';

const List = ({ items }: { items: string[] }) => (
  <ul className="list-disc pl-5 space-y-1">
    {items.map((item) => (
      <li key={item}>{item}</li>
    ))}
  </ul>
);

export default function PrivacyPolicyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      lastUpdated="27 August 2026"
      intro={
        <>
          <p>
            Indore Software Association ("ISA", "we", "us", or "our") respects your privacy and is
            committed to protecting the personal information of our members, visitors, event
            participants, partners, and users of our website and services.
          </p>
          <p>
            This Privacy Policy explains how we collect, use, disclose, store, and protect information
            when you visit or use theisa.in, register as an ISA member, participate in ISA events
            (including the ISA Tech Marathon), submit enquiries, use our member directory, or interact
            with ISA through our website and related services.
          </p>
        </>
      }
      sections={[
        {
          heading: '1. About ISA',
          body: (
            <p>
              Indore Software Association is a registered society based in Indore, Madhya Pradesh,
              India. ISA operates as a technology and business community focused on networking,
              collaboration, knowledge sharing, industry development, policy advocacy, events, and
              opportunities for technology businesses and professionals.
            </p>
          ),
        },
        {
          heading: '2. Information We Collect',
          body: (
            <>
              <p>Depending on how you interact with ISA, we may collect the following information:</p>
              <p className="font-semibold text-brand-navy">Information You Provide</p>
              <List
                items={[
                  'Full name',
                  'Company or organization name',
                  'Designation and professional information',
                  'Email address',
                  'Mobile/telephone number',
                  'Business address',
                  'Website, social media, or professional profile information',
                  'Membership and registration information',
                  'Event registration details',
                  'Information submitted through contact, enquiry, membership, or application forms',
                  'Information you voluntarily provide when posting resources, projects, opportunities, or other content',
                ]}
              />
              <p className="font-semibold text-brand-navy">Payment Information</p>
              <p>
                Where membership fees, event fees, sponsorships, or other payments are applicable,
                payments may be processed through third-party payment providers. ISA may receive
                transaction-related information such as payment status, transaction reference, amount,
                and date. We generally do not store complete credit/debit card details or banking
                credentials on our servers.
              </p>
              <p className="font-semibold text-brand-navy">Automatically Collected Information</p>
              <List
                items={[
                  'IP address',
                  'Browser and device information',
                  'Operating system',
                  'Pages visited',
                  'Referring website',
                  'Date and time of access',
                  'Website usage and interaction information',
                  'Cookies and similar technologies',
                ]}
              />
            </>
          ),
        },
        {
          heading: '3. How We Use Your Information',
          body: (
            <List
              items={[
                'Create and manage ISA membership accounts',
                'Process membership applications and renewals',
                'Manage event registrations and participation',
                'Communicate with members and users',
                'Respond to enquiries and requests',
                'Maintain the ISA member directory',
                'Facilitate professional networking and business collaboration',
                'Share relevant events, programs, announcements, and opportunities',
                'Provide member benefits and services',
                'Improve our website, services, and member experience',
                'Maintain website security and prevent misuse',
                'Process payments and maintain appropriate financial records',
                'Comply with applicable legal and regulatory requirements',
                'Conduct internal administration and organizational activities',
              ]}
            />
          ),
        },
        {
          heading: '4. Member Directory and Professional Information',
          body: (
            <>
              <p>
                ISA may provide a member directory or other networking features intended to facilitate
                professional connections. If you become an ISA member and information is displayed in
                the member directory, certain professional information may be visible to other members
                or website visitors depending on the applicable platform settings.
              </p>
              <p>
                Members are responsible for ensuring that the information they submit is accurate and
                that they have the necessary rights or permissions to provide such information. ISA does
                not guarantee the accuracy, suitability, or reliability of information submitted by
                individual members or organizations.
              </p>
            </>
          ),
        },
        {
          heading: '5. Event Photography and Media',
          body: (
            <p>
              ISA events, meetings, conferences, networking sessions, sports activities (including the
              ISA Tech Marathon), workshops, and other programs may be photographed, recorded, or
              otherwise documented. By attending an ISA event, you acknowledge that photographs, videos,
              or other recordings may be taken and may be used by ISA for legitimate organizational,
              promotional, educational, archival, social media, website, marketing, or communication
              purposes. If you have a specific concern regarding the use of an identifiable photograph
              or recording, you may contact ISA using the details below.
            </p>
          ),
        },
        {
          heading: '6. Cookies and Similar Technologies',
          body: (
            <>
              <p>Our website may use cookies and similar technologies to:</p>
              <List
                items={[
                  'Enable essential website functionality',
                  'Maintain login or session information',
                  'Understand website usage',
                  'Improve website performance',
                  'Remember user preferences',
                  'Support analytics and website improvements',
                ]}
              />
              <p>
                You may configure your browser to refuse or delete cookies. Certain website
                functionality may not work correctly if essential cookies are disabled.
              </p>
            </>
          ),
        },
        {
          heading: '7. Sharing of Information',
          body: (
            <>
              <p>ISA does not sell your personal information. We may share information where reasonably necessary with:</p>
              <List
                items={[
                  'Service providers assisting with website hosting, technology, communications, analytics, payments, or other operational activities',
                  'Event partners or service providers where required to organize an event or provide a requested service',
                  'Government authorities, regulators, courts, or law-enforcement agencies where required by applicable law',
                  'Professional advisors, auditors, or legal representatives where reasonably necessary',
                  'Other ISA members or participants where information is intentionally submitted for networking, directory, collaboration, or community purposes',
                ]}
              />
              <p>
                Third-party service providers may process information according to their own privacy
                policies and applicable contractual or legal obligations.
              </p>
            </>
          ),
        },
        {
          heading: '8. Third-Party Links and Services',
          body: (
            <p>
              The ISA website may contain links to third-party websites, platforms, payment gateways,
              social media services, event venues, or other external services. ISA is not responsible
              for the privacy practices, security, content, or policies of third-party websites or
              services. We encourage you to review the privacy policy of any third-party service before
              providing personal information.
            </p>
          ),
        },
        {
          heading: '9. Data Security',
          body: (
            <p>
              ISA takes reasonable administrative, technical, and organizational measures to protect
              personal information against unauthorized access, misuse, alteration, disclosure, or
              destruction. However, no website, electronic transmission, or storage system can be
              guaranteed to be completely secure. Accordingly, ISA cannot guarantee absolute security of
              information transmitted through the internet.
            </p>
          ),
        },
        {
          heading: '10. Data Retention',
          body: (
            <p>
              We retain personal information for as long as reasonably necessary for the purposes
              described in this Privacy Policy, including membership administration, event management,
              organizational records, legal obligations, dispute resolution, and legitimate business or
              administrative purposes. When information is no longer reasonably required, we may delete,
              anonymize, or securely dispose of it in accordance with applicable requirements.
            </p>
          ),
        },
        {
          heading: '11. Your Rights and Choices',
          body: (
            <>
              <p>Subject to applicable law, you may contact ISA to:</p>
              <List
                items={[
                  'Request access to personal information held about you',
                  'Request correction of inaccurate information',
                  'Request updating of your profile or membership information',
                  'Request deletion of information where legally permissible',
                  'Withdraw certain communications or marketing preferences',
                  'Raise a concern regarding the processing of your personal information',
                ]}
              />
              <p>
                Some information may need to be retained where required for legal, regulatory,
                accounting, security, or legitimate organizational purposes.
              </p>
            </>
          ),
        },
        {
          heading: "12. Children's Privacy",
          body: (
            <p>
              The ISA website and membership services are primarily intended for professionals,
              businesses, founders, technology leaders, and organizations. We do not knowingly seek to
              collect personal information from children for membership or professional networking
              purposes. If you believe that a child has provided personal information to ISA without
              appropriate consent, please contact us so that we can review and take appropriate action.
            </p>
          ),
        },
        {
          heading: '13. Changes to This Privacy Policy',
          body: (
            <p>
              ISA may update this Privacy Policy from time to time to reflect changes in our services,
              technology, legal requirements, or organizational practices. The updated version will be
              published on this page with a revised "Last Updated" date.
            </p>
          ),
        },
        {
          heading: '14. Contact Us',
          body: (
            <>
              <p>
                If you have questions, concerns, requests, or complaints regarding this Privacy Policy or
                the handling of your personal information, please contact:
              </p>
              <p className="text-brand-navy">
                <span className="font-semibold">Indore Software Association (ISA)</span>
                <br />
                Vijay Nagar, Indore, Madhya Pradesh &ndash; 452009, India
                <br />
                Email: <a href="mailto:info@theisa.in" className="text-brand-orange hover:underline">info@theisa.in</a>
                <br />
                Website: <a href="https://www.theisa.in/" className="text-brand-orange hover:underline">theisa.in</a>
              </p>
              <p>
                By using the ISA website or submitting information to ISA, you acknowledge that you have
                read and understood this Privacy Policy.
              </p>
            </>
          ),
        },
      ]}
    />
  );
}
