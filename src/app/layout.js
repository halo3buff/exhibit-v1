import "./globals.css";

export const metadata = {
  title: "Exhibit",
  description: "A place to keep the work that shapes your taste.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="bg-neutral-100 text-black">
        {children}
      </body>
    </html>
  );
}
