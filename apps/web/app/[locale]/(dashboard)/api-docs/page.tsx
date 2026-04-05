"use client";

export default function ApiDocsPage() {
  return (
    <div className="h-full overflow-hidden">
      <iframe
        src={`${process.env.NEXT_PUBLIC_API_URL}/api/v1/docs`}
        className="w-full h-full border-0"
        title="API Documentation"
      />
    </div>
  );
}
