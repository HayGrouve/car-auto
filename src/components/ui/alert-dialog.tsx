"use client";

import * as React from "react";
import {
  AlertDialog as AlertDialogPrimitiveRoot,
  AlertDialogTrigger as AlertDialogPrimitiveTrigger,
  AlertDialogPortal as AlertDialogPrimitivePortal,
  AlertDialogOverlay as AlertDialogPrimitiveOverlay,
  AlertDialogContent as AlertDialogPrimitiveContent,
  AlertDialogTitle as AlertDialogPrimitiveTitle,
  AlertDialogDescription as AlertDialogPrimitiveDescription,
  AlertDialogAction as AlertDialogPrimitiveAction,
  AlertDialogCancel as AlertDialogPrimitiveCancel,
  type AlertDialogOverlayProps,
  type AlertDialogContentProps,
  type AlertDialogTitleProps,
  type AlertDialogDescriptionProps,
  type AlertDialogActionProps,
  type AlertDialogCancelProps,
} from "@radix-ui/react-alert-dialog";
import { cn } from "@/lib/utils";

const AlertDialog = AlertDialogPrimitiveRoot;
const AlertDialogTrigger = AlertDialogPrimitiveTrigger;
const AlertDialogPortal = AlertDialogPrimitivePortal;

const AlertDialogOverlay = React.forwardRef<
  HTMLDivElement,
  AlertDialogOverlayProps
>(({ className, ...props }, ref) => (
  <AlertDialogPrimitiveOverlay
    ref={ref}
    className={cn(
      "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/50",
      className,
    )}
    {...props}
  />
));
AlertDialogOverlay.displayName = AlertDialogPrimitiveOverlay.displayName;

const AlertDialogContent = React.forwardRef<
  HTMLDivElement,
  AlertDialogContentProps
>(({ className, ...props }, ref) => (
  <AlertDialogPortal>
    <AlertDialogOverlay />
    <AlertDialogPrimitiveContent
      ref={ref}
      className={cn(
        "bg-background data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 fixed top-1/2 left-1/2 z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 rounded-lg border p-6 shadow-lg duration-200",
        className,
      )}
      {...props}
    />
  </AlertDialogPortal>
));
AlertDialogContent.displayName = AlertDialogPrimitiveContent.displayName;

const AlertDialogHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col space-y-2 text-center sm:text-left",
      className,
    )}
    {...props}
  />
);
AlertDialogHeader.displayName = "AlertDialogHeader";

const AlertDialogFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:space-y-0 sm:space-x-2",
      className,
    )}
    {...props}
  />
);
AlertDialogFooter.displayName = "AlertDialogFooter";

const AlertDialogTitle = React.forwardRef<
  HTMLHeadingElement,
  AlertDialogTitleProps
>(({ className, ...props }, ref) => (
  <AlertDialogPrimitiveTitle
    ref={ref}
    className={cn("text-lg font-semibold", className)}
    {...props}
  />
));
AlertDialogTitle.displayName = AlertDialogPrimitiveTitle.displayName;

const AlertDialogDescription = React.forwardRef<
  HTMLParagraphElement,
  AlertDialogDescriptionProps
>(({ className, ...props }, ref) => (
  <AlertDialogPrimitiveDescription
    ref={ref}
    className={cn("text-muted-foreground text-sm", className)}
    {...props}
  />
));
AlertDialogDescription.displayName =
  AlertDialogPrimitiveDescription.displayName;

const AlertDialogAction = React.forwardRef<
  HTMLButtonElement,
  AlertDialogActionProps
>(({ className, ...props }, ref) => (
  <AlertDialogPrimitiveAction
    ref={ref}
    className={cn(
      "bg-primary text-primary-foreground hover:bg-primary/90 focus:ring-primary inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition-colors focus:ring-2 focus:ring-offset-2 focus:outline-hidden",
      className,
    )}
    {...props}
  />
));
AlertDialogAction.displayName = AlertDialogPrimitiveAction.displayName;

const AlertDialogCancel = React.forwardRef<
  HTMLButtonElement,
  AlertDialogCancelProps
>(({ className, ...props }, ref) => (
  <AlertDialogPrimitiveCancel
    ref={ref}
    className={cn(
      "bg-background hover:bg-muted focus:ring-primary inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm font-medium transition-colors focus:ring-2 focus:ring-offset-2 focus:outline-hidden",
      className,
    )}
    {...props}
  />
));
AlertDialogCancel.displayName = AlertDialogPrimitiveCancel.displayName;

export {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
};
