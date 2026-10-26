import { APP_NAME, SUPPORT_EMAIL } from "@/config/brand";

export const metadata = { title: "Privacy" };

export default function Page() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-12 leading-8">
      <h1 className="text-4xl">Privacy</h1>
      <p className="mt-4">We use your photos only to make the portraits you ordered. We don’t put them in a public gallery, and we don’t use them to train models or advertise other people.</p>
      <p className="mt-3">Uploads and finished images are stored in private buckets. The gallery link is unguessable, and image links expire. Uploaded photos from a one-off order are deleted 7 days after delivery. A season pass keeps those photos for up to a year so the next season can use them. Results are deleted 30 days after delivery.</p>
      <p className="mt-3">You must own the photos or have permission from everyone in them, including a parent’s permission for any child. We reject nudity, sexual content, violence and gore.</p>
      <p className="mt-3">Payments are taken by Stripe. Email is sent by Resend when that’s connected. Prints are made by Prodigi and posted to a UK address you enter at checkout.</p>
      <p className="mt-3">Marketing pixels load only after you accept cookies. Questions: {SUPPORT_EMAIL}. {APP_NAME}.</p>
    </main>
  );
}
