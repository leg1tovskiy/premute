import * as SelectPrimitive from "@radix-ui/react-select";
import { Check, ChevronDown, ChevronUp } from "lucide-react";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export const Select = SelectPrimitive.Root;
export const SelectGroup = SelectPrimitive.Group;
export const SelectValue = SelectPrimitive.Value;

export function SelectTrigger({
  className,
  children,
  ...props
}: ComponentProps<typeof SelectPrimitive.Trigger>) {
  return (
    <SelectPrimitive.Trigger
      className={cn(
        "flex h-9.5 w-full items-center justify-between gap-2 rounded-xl border border-border/80 bg-elevated/70 px-3 text-xs font-medium text-fg shadow-xs transition-colors outline-none hover:border-border hover:bg-elevated/90 focus:border-accent focus:ring-1 focus:ring-accent disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1 cursor-pointer",
        className,
      )}
      {...props}
    >
      {children}
      <SelectPrimitive.Icon asChild>
        <ChevronDown className="size-3.5 shrink-0 text-muted transition-transform duration-200" />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  );
}

export function SelectScrollUpButton({
  className,
  ...props
}: ComponentProps<typeof SelectPrimitive.ScrollUpButton>) {
  return (
    <SelectPrimitive.ScrollUpButton
      className={cn("flex cursor-default items-center justify-center py-1 text-muted", className)}
      {...props}
    >
      <ChevronUp className="size-3.5" />
    </SelectPrimitive.ScrollUpButton>
  );
}

export function SelectScrollDownButton({
  className,
  ...props
}: ComponentProps<typeof SelectPrimitive.ScrollDownButton>) {
  return (
    <SelectPrimitive.ScrollDownButton
      className={cn("flex cursor-default items-center justify-center py-1 text-muted", className)}
      {...props}
    >
      <ChevronDown className="size-3.5" />
    </SelectPrimitive.ScrollDownButton>
  );
}

export function SelectContent({
  className,
  children,
  position = "popper",
  sideOffset = 4,
  ...props
}: ComponentProps<typeof SelectPrimitive.Content>) {
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Content
        position={position}
        sideOffset={sideOffset}
        className={cn(
          "relative z-50 max-h-80 min-w-[8rem] overflow-hidden rounded-2xl border border-border/90 bg-surface/95 p-1 text-fg shadow-xl backdrop-blur-xl animate-fade-up",
          position === "popper" &&
            "data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1",
          className,
        )}
        {...props}
      >
        <SelectScrollUpButton />
        <SelectPrimitive.Viewport
          className={cn(
            "p-1",
            position === "popper" &&
              "h-[var(--radix-select-trigger-height)] w-full min-w-[var(--radix-select-trigger-width)]",
          )}
        >
          {children}
        </SelectPrimitive.Viewport>
        <SelectScrollDownButton />
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  );
}

export function SelectLabel({
  className,
  ...props
}: ComponentProps<typeof SelectPrimitive.Label>) {
  return (
    <SelectPrimitive.Label
      className={cn("px-2.5 py-1.5 text-[11px] font-semibold text-muted uppercase tracking-wider", className)}
      {...props}
    />
  );
}

export function SelectItem({
  className,
  children,
  ...props
}: ComponentProps<typeof SelectPrimitive.Item>) {
  return (
    <SelectPrimitive.Item
      className={cn(
        "relative flex w-full cursor-pointer select-none items-center rounded-xl py-2 pl-8 pr-3 text-xs font-medium text-fg outline-none transition-colors hover:bg-accent/15 hover:text-accent focus:bg-accent/15 focus:text-accent data-[disabled]:pointer-events-none data-[disabled]:opacity-40",
        className,
      )}
      {...props}
    >
      <span className="absolute left-2.5 flex size-3.5 items-center justify-center">
        <SelectPrimitive.ItemIndicator>
          <Check className="size-3.5 text-accent stroke-[2.5]" />
        </SelectPrimitive.ItemIndicator>
      </span>
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
    </SelectPrimitive.Item>
  );
}

export function SelectSeparator({
  className,
  ...props
}: ComponentProps<typeof SelectPrimitive.Separator>) {
  return (
    <SelectPrimitive.Separator
      className={cn("-mx-1 my-1 h-px bg-border/60", className)}
      {...props}
    />
  );
}
