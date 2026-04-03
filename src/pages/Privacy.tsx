import { Header } from "../components/layout/Header";

export function Privacy() {
  return (
    <div className="min-h-screen bg-[var(--color-bg)] px-5 py-6" style={{ paddingTop: "calc(var(--safe-area-top) + 94px)" }}>
      <Header showBackButton fallbackTo="/" />

      <h1 className="font-[var(--font-display)] text-2xl font-bold text-[var(--color-text)] mb-6">
        Privacy Policy
      </h1>

      <div className="flex flex-col gap-5 text-sm text-[var(--color-text-secondary)] leading-relaxed">
        <p className="text-[var(--color-text)] font-medium">
          Tiny Tummy is built with your family's privacy as the top priority.
        </p>

        <section>
          <h2 className="font-semibold text-[var(--color-text)] mb-1">No Data Collection</h2>
          <p>
            Tiny Tummy does not collect, transmit, or have access to any of your data. There are no
            analytics, no crash reporting, no tracking pixels, and no third-party SDKs that send
            data anywhere.
          </p>
        </section>

        <section>
          <h2 className="font-semibold text-[var(--color-text)] mb-1">100% On-Device Storage</h2>
          <p>
            All data — including your children's profiles, poop logs, diet logs, photos, alerts,
            and preferences — is stored exclusively on your device in the app's private storage area.
            No information is ever uploaded to any server.
          </p>
        </section>

        <section>
          <h2 className="font-semibold text-[var(--color-text)] mb-1">No Network Access</h2>
          <p>
            Tiny Tummy makes zero network requests. The app works entirely offline and does not
            require an internet connection at any point. It does not have permission to access the
            network.
          </p>
        </section>

        <section>
          <h2 className="font-semibold text-[var(--color-text)] mb-1">No Accounts Required</h2>
          <p>
            There is no sign-up, login, or account creation. The app is ready to use immediately
            after installation.
          </p>
        </section>

        <section>
          <h2 className="font-semibold text-[var(--color-text)] mb-1">Photos</h2>
          <p>
            If you choose to attach photos to log entries, they are saved to the app's private
            storage on your device. Photos are never uploaded, shared, or accessible to other apps.
          </p>
        </section>

        <section>
          <h2 className="font-semibold text-[var(--color-text)] mb-1">Notifications</h2>
          <p>
            If you enable daily reminders, notifications are scheduled locally on your device.
            No notification data is sent to any server.
          </p>
        </section>

        <section>
          <h2 className="font-semibold text-[var(--color-text)] mb-1">Data Deletion</h2>
          <p>
            Uninstalling the app permanently deletes all data. You can also delete individual
            children's profiles and log entries from within the app at any time.
          </p>
        </section>

        <section>
          <h2 className="font-semibold text-[var(--color-text)] mb-1">Contact</h2>
          <p>
            If you have questions about this privacy policy, contact us at privacy@tinytummy.app.
          </p>
        </section>

        <p className="text-xs text-[var(--color-muted)] mt-4">
          Last updated: March 2026
        </p>
      </div>
    </div>
  );
}
