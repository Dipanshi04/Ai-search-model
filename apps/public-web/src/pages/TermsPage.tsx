import LegalPage from '../components/LegalPage';

const List = ({ items }: { items: string[] }) => (
  <ul className="list-disc pl-5 space-y-1">
    {items.map((item) => (
      <li key={item}>{item}</li>
    ))}
  </ul>
);

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms & Conditions"
      lastUpdated="27 August 2026"
      intro={
        <>
          <p>Welcome to the website of Indore Software Association ("ISA", "we", "us", or "our").</p>
          <p>
            These Terms & Conditions govern your access to and use of theisa.in, ISA membership
            services, member directory, events (including the ISA Tech Marathon), networking
            facilities, resources, project-sharing features, and other services made available by ISA.
          </p>
          <p>
            By accessing or using the website or ISA services, you agree to be bound by these Terms &
            Conditions. If you do not agree with these terms, please do not use the website or services.
          </p>
        </>
      }
      sections={[
        {
          heading: '1. About ISA',
          body: (
            <>
              <p>
                Indore Software Association is a registered society based in Indore, Madhya Pradesh,
                India.
              </p>
              <p>
                ISA provides a professional ecosystem for technology companies, founders, CXOs,
                professionals, entrepreneurs, and other eligible participants to connect, collaborate,
                exchange knowledge, participate in events, and contribute to the development of the
                technology ecosystem.
              </p>
              <p>
                The website currently provides facilities including membership, events, member
                directory, knowledge resources, networking, and business/resource collaboration
                features.
              </p>
            </>
          ),
        },
        {
          heading: '2. Eligibility',
          body: (
            <>
              <p>You may use ISA services only if:</p>
              <List
                items={[
                  'You are legally capable of entering into an agreement under applicable law;',
                  'The information provided by you is accurate and complete;',
                  'You comply with these Terms & Conditions and applicable laws.',
                ]}
              />
              <p>
                Certain ISA membership categories, events, programs, or services may have additional
                eligibility requirements. ISA reserves the right to approve, reject, suspend, or
                terminate membership or participation at its discretion, subject to applicable law and
                ISA's governing rules.
              </p>
            </>
          ),
        },
        {
          heading: '3. Membership',
          body: (
            <>
              <p>
                ISA may offer different membership categories or plans, including free and paid
                membership options. Membership benefits, fees, eligibility requirements, and features
                may vary by membership category and may be changed by ISA from time to time.
              </p>
              <p>
                Membership does not create an employment, agency, partnership, joint venture, franchise,
                or other legal relationship between ISA and a member unless expressly agreed in writing.
              </p>
            </>
          ),
        },
        {
          heading: '4. Membership Information',
          body: (
            <>
              <p>Members must provide accurate, current, and complete information. You are responsible for:</p>
              <List
                items={[
                  'Maintaining the accuracy of your profile;',
                  'Updating information when it changes;',
                  'Keeping your account credentials confidential;',
                  'Preventing unauthorized use of your account;',
                  'Immediately informing ISA of suspected unauthorized access.',
                ]}
              />
              <p>
                ISA may suspend or restrict an account containing inaccurate, misleading, fraudulent, or
                inappropriate information.
              </p>
            </>
          ),
        },
        {
          heading: '5. Membership Fees and Payments',
          body: (
            <>
              <p>Where a paid membership, event registration, sponsorship, or other paid service is offered:</p>
              <List
                items={[
                  'Applicable fees will be communicated before payment;',
                  'Payments may be processed through third-party payment providers;',
                  'Members are responsible for providing accurate payment information;',
                  'Membership or event benefits may be subject to successful payment;',
                  'Taxes, where applicable, may be charged in addition to stated fees.',
                ]}
              />
              <p>
                Unless otherwise specifically communicated by ISA, membership fees and event fees are
                subject to the applicable cancellation and refund policy communicated at the time of
                purchase or registration.
              </p>
            </>
          ),
        },
        {
          heading: '6. Events',
          body: (
            <>
              <p>
                ISA may organize networking events, conferences, workshops, sports activities (including
                the ISA Tech Marathon), social gatherings, business meetings, knowledge sessions, and
                other programs. Event details such as dates, venues, speakers, schedules, eligibility,
                fees, and availability may change.
              </p>
              <p>ISA reserves the right to:</p>
              <List
                items={[
                  'Change the event schedule or venue;',
                  'Replace speakers or participants;',
                  'Modify event content;',
                  'Limit attendance;',
                  'Cancel or postpone an event when reasonably necessary.',
                ]}
              />
              <p>
                Where an event is cancelled or materially changed, ISA will communicate the applicable
                arrangements to registered participants.
              </p>
            </>
          ),
        },
        {
          heading: '7. ISA Tech Marathon Registration Fees & Refunds',
          body: (
            <>
              <p>
                This section applies specifically to paid registrations for the ISA Tech Marathon and
                takes precedence over Section 5 above for that event.
              </p>
              <List
                items={[
                  'Registration fees are strictly non-refundable and non-transferable once payment is confirmed, including for cancellations, no-shows, or inability to attend, regardless of when the request is made.',
                  'If the organizers postpone or cancel the event, registered participants will be notified of the applicable arrangements.',
                ]}
              />
            </>
          ),
        },
        {
          heading: '8. Networking and Member Interactions',
          body: (
            <>
              <p>
                ISA is a networking and professional community platform. Information, introductions,
                referrals, opportunities, proposals, business discussions, projects, employment
                opportunities, or other communications exchanged between members are primarily
                interactions between the relevant parties.
              </p>
              <p>ISA does not guarantee:</p>
              <List
                items={[
                  'The quality of any member;',
                  'The accuracy of member-provided information;',
                  'The success of a business introduction;',
                  'The completion of a commercial transaction;',
                  'The performance of a member or organization;',
                  'The financial or legal standing of a member;',
                  'Any particular business outcome.',
                ]}
              />
              <p>
                Members are responsible for conducting their own due diligence before entering into any
                commercial, professional, financial, employment, or other relationship.
              </p>
            </>
          ),
        },
        {
          heading: '9. Member-Submitted Content',
          body: (
            <>
              <p>
                Members may be permitted to submit profiles, company information, articles, images,
                project descriptions, job opportunities, resources, announcements, or other content. You
                remain responsible for the content you submit. By submitting content to ISA, you
                represent that:
              </p>
              <List
                items={[
                  'You own the content or have appropriate rights and permissions to submit it;',
                  "The content does not infringe the intellectual property, privacy, publicity, or other rights of another person;",
                  'The content is accurate to the best of your knowledge;',
                  'The content does not violate applicable law;',
                  'The content does not contain malicious code or harmful material.',
                ]}
              />
              <p>
                You grant ISA a non-exclusive, royalty-free, worldwide license to host, reproduce,
                display, publish, distribute, and use submitted content as reasonably necessary to
                operate, promote, administer, and communicate ISA's services and activities. ISA may
                remove content that it reasonably believes violates these Terms, applicable law, or ISA's
                community standards.
              </p>
            </>
          ),
        },
        {
          heading: '10. Prohibited Activities',
          body: (
            <>
              <p>You agree not to use the ISA website or services to:</p>
              <List
                items={[
                  'Provide false, misleading, or fraudulent information;',
                  'Impersonate another person or organization;',
                  'Harass, threaten, abuse, or discriminate against others;',
                  'Upload malicious software or harmful code;',
                  'Attempt to gain unauthorized access to systems or accounts;',
                  'Scrape, copy, or systematically extract member information without authorization;',
                  'Misuse member contact information for spam or unsolicited marketing;',
                  'Publish unlawful, defamatory, obscene, or infringing content;',
                  'Conduct fraudulent schemes or illegal activities;',
                  'Interfere with the operation or security of the website;',
                  'Use ISA services in a manner that could harm ISA, its members, partners, or other users.',
                ]}
              />
              <p>ISA may suspend or terminate access for violations of these Terms.</p>
            </>
          ),
        },
        {
          heading: '11. Intellectual Property',
          body: (
            <>
              <p>
                Unless otherwise stated, the ISA website and its original content, branding, logos,
                graphics, designs, text, photographs, videos, software, and other materials are owned by
                or licensed to ISA and are protected by applicable intellectual property laws.
              </p>
              <p>
                You may not reproduce, modify, distribute, sell, publicly display, or commercially
                exploit ISA materials without prior written permission, except where permitted by
                applicable law. Member-owned trademarks, logos, and content remain the property of their
                respective owners.
              </p>
            </>
          ),
        },
        {
          heading: '12. Third-Party Services and Links',
          body: (
            <p>
              The ISA website may contain links or integrations to third-party websites, payment
              providers, social media platforms, event services, or other external services. ISA does
              not control and is not responsible for third-party services, their availability, content,
              security, privacy practices, or terms. Your use of third-party services is subject to the
              applicable third party's terms and policies.
            </p>
          ),
        },
        {
          heading: '13. Website Availability',
          body: (
            <>
              <p>ISA makes reasonable efforts to maintain the website and services, but does not guarantee that:</p>
              <List
                items={[
                  'The website will always be available;',
                  'Services will always operate without interruption;',
                  'Information will always be complete or error-free;',
                  'Website content will always be current;',
                  'Technical defects will always be corrected immediately.',
                ]}
              />
              <p>
                ISA may temporarily suspend website access for maintenance, security, upgrades, or other
                operational reasons.
              </p>
            </>
          ),
        },
        {
          heading: '14. Disclaimer',
          body: (
            <>
              <p>
                ISA provides its website, community services, networking facilities, events, and related
                information on an "as available" basis. ISA does not guarantee any specific business,
                financial, professional, employment, networking, investment, or commercial outcome from
                membership or participation.
              </p>
              <p>
                Any information, recommendation, introduction, opportunity, or content provided through
                ISA should be independently evaluated by the user before reliance or action.
              </p>
            </>
          ),
        },
        {
          heading: '15. Limitation of Liability',
          body: (
            <>
              <p>
                To the maximum extent permitted by applicable law, ISA and its office bearers,
                representatives, volunteers, employees, service providers, and affiliates shall not be
                liable for indirect, incidental, special, consequential, or punitive losses arising from
                or relating to:
              </p>
              <List
                items={[
                  'Use or inability to use the website;',
                  'Participation in ISA activities or events;',
                  'Interactions between members;',
                  'Business transactions between members;',
                  'Reliance on member-submitted information;',
                  'Third-party services;',
                  "Unauthorized access or security incidents beyond ISA's reasonable control.",
                ]}
              />
              <p>
                Nothing in these Terms is intended to exclude or limit liability that cannot lawfully be
                excluded or limited under applicable law.
              </p>
            </>
          ),
        },
        {
          heading: '16. Indemnification',
          body: (
            <>
              <p>
                To the extent permitted by applicable law, you agree to indemnify and hold harmless ISA
                and its representatives, office bearers, employees, volunteers, and service providers
                from claims, losses, liabilities, damages, costs, and expenses arising from:
              </p>
              <List
                items={[
                  'Your violation of these Terms;',
                  'Your misuse of ISA services;',
                  'Your submitted content;',
                  "Your violation of another person's rights;",
                  'Your unlawful or unauthorized activities.',
                ]}
              />
            </>
          ),
        },
        {
          heading: '17. Suspension and Termination',
          body: (
            <>
              <p>ISA may suspend, restrict, or terminate your access to its website, membership, events, or services if:</p>
              <List
                items={[
                  'You violate these Terms;',
                  'You provide false or misleading information;',
                  'Your conduct harms ISA or its community;',
                  'Your activity creates a security or legal risk;',
                  'Your membership expires or fees remain unpaid, where applicable;',
                  'Termination is otherwise reasonably necessary to protect the interests of ISA or its members.',
                ]}
              />
              <p>Termination does not affect provisions that by their nature should continue after termination.</p>
            </>
          ),
        },
        {
          heading: '18. Privacy',
          body: (
            <p>
              Your use of the ISA website and services is also subject to our{' '}
              <a href="/privacy" className="text-brand-orange hover:underline">Privacy Policy</a>, which
              explains how we collect and process personal information.
            </p>
          ),
        },
        {
          heading: '19. Changes to These Terms',
          body: (
            <p>
              ISA may update these Terms & Conditions from time to time. Changes will become effective
              when the updated Terms are published on the website unless a different effective date is
              stated. Your continued use of ISA services after changes are published constitutes
              acceptance of the updated Terms, to the extent permitted by law.
            </p>
          ),
        },
        {
          heading: '20. Governing Law and Jurisdiction',
          body: (
            <p>
              These Terms & Conditions shall be governed by and interpreted in accordance with the laws
              of India. Subject to applicable law, courts having appropriate jurisdiction in Indore,
              Madhya Pradesh shall have jurisdiction over disputes arising from or relating to these
              Terms or your use of ISA services.
            </p>
          ),
        },
        {
          heading: '21. Severability',
          body: (
            <p>
              If any provision of these Terms is determined to be invalid, illegal, or unenforceable, the
              remaining provisions shall continue in full force and effect.
            </p>
          ),
        },
        {
          heading: '22. Entire Agreement',
          body: (
            <p>
              These Terms, together with the Privacy Policy and any additional terms specifically
              applicable to particular ISA services, events, memberships, or programs, constitute the
              understanding governing your use of ISA services.
            </p>
          ),
        },
        {
          heading: '23. Contact Us',
          body: (
            <>
              <p>For questions regarding these Terms & Conditions, please contact:</p>
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
                By accessing or using the ISA website and services, you acknowledge that you have read,
                understood, and agreed to these Terms & Conditions.
              </p>
            </>
          ),
        },
      ]}
    />
  );
}
