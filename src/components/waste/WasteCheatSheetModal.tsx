import Image from "next/image";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";

export function WasteCheatSheetModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl p-0 overflow-hidden">
        <div className="p-6 pb-3">
          <DialogHeader>
            <DialogTitle className="text-brand-navy">Eight Wastes Cheat Sheet</DialogTitle>
            <DialogDescription className="text-brand-charcoal">
              Quick reference for identifying waste in workflows.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="px-6 pb-6">
          <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
            <div className="max-h-[75vh] overflow-auto">
              <Image
                src="/cheatsheets/8-wastes.png"
                alt="Eight Wastes cheat sheet"
                width={1200}
                height={1200}
                priority={false}
                className="w-full h-auto select-none"
                sizes="(max-width: 768px) 92vw, 960px"
              />
            </div>
          </div>

          <div className="mt-4 flex items-center justify-end">
            <Button asChild variant="outline" size="sm" className="bg-white">
              <a
                href="/cheatsheets/8-wastes.png"
                target="_blank"
                rel="noreferrer"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Open full size
              </a>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

