import Image from 'next/image';

export function Footer() {
  return (
    <footer className="py-6 mt-auto border-t border-border/30">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <Image
            src="/logo.png"
            alt="Sprint"
            width={16}
            height={16}
            className="w-4 h-4 opacity-60 dark:invert dark:brightness-200"
          />
          <span className="font-bold italic">Sprint</span>
          
        </div>
      </div>
    </footer>
  );
}
