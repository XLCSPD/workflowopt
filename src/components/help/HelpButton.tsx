"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { HelpCircle } from "lucide-react";
import { HelpDrawer } from "./HelpDrawer";

interface HelpButtonProps {
  className?: string;
}

export function HelpButton({ className }: HelpButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className={className}
              onClick={() => setIsOpen(true)}
              aria-label="Open help"
            >
              <HelpCircle className="h-5 w-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Help</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <HelpDrawer open={isOpen} onOpenChange={setIsOpen} />
    </>
  );
}

