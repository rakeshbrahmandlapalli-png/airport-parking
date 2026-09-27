import Image from "next/image";

/**
 * Horizontal AeroPark Direct logo (mark + wordmark), cut from the master
 * artwork in /public/logo.png. `tone="light"` is for light backgrounds,
 * `tone="dark"` for the navy footer and dark panels.
 */
export default function Logo({
  tone = "light",
  className = "h-8 md:h-9 w-auto",
  priority = false,
}: {
  tone?: "light" | "dark";
  className?: string;
  priority?: boolean;
}) {
  return (
    <Image
      src={tone === "dark" ? "/brand/logo-horizontal-white.png" : "/brand/logo-horizontal.png"}
      alt="AeroPark Direct"
      width={1449}
      height={200}
      priority={priority}
      className={className}
    />
  );
}
