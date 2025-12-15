import * as React from "react";
import { HiOutlineClipboard, HiCheck } from "react-icons/hi2";
import { Button } from "./button";
import { Input } from "./input";
import { cn } from "@/lib/utils";

export interface CopiableInputProps extends React.ComponentPropsWithoutRef<typeof Input> {
  buttonProps?: React.ComponentPropsWithoutRef<typeof Button>;
  onCopy?: () => void;
}

const CopiableInput = React.forwardRef<HTMLInputElement, CopiableInputProps>(
  ({ className, buttonProps, onCopy, ...props }, ref) => {
    const [isCopied, setIsCopied] = React.useState(false);

    const handleCopy = React.useCallback(async () => {
      if (props.value) {
        await navigator.clipboard.writeText(props.value.toString());
        setIsCopied(true);
        onCopy?.();

        setTimeout(() => {
          setIsCopied(false);
        }, 1000);
      }
    }, [isCopied, props.value, onCopy]);

    return (
      <div className="relative h-9">
        <Input ref={ref} className={cn("pr-10", className)} {...props} />
        <div className="absolute right-0 top-0 h-full flex flex-row justify-center items-center gap-2 w-10">
          <Button variant="ghost" size="icon-sm" onClick={handleCopy} disabled={isCopied} {...buttonProps}>
            {isCopied ? <HiCheck className="text-green-500" /> : <HiOutlineClipboard />}
          </Button>
        </div>
      </div>
    );
  },
);

CopiableInput.displayName = "CopiableInput";

export { CopiableInput };
