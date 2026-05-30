import {
  forwardRef,
  type ComponentPropsWithoutRef,
  type ForwardedRef,
  type HTMLAttributes,
  type ReactNode,
} from "react";
import { cn } from "@/shared/lib/cn";
import { InteractiveGlassSurface } from "./glass-surface.client";

export type GlassTint = "warm" | "body" | "cool" | "clear";
export type GlassBlur = "xs" | "sm" | "md" | "lg" | "xl" | "2xl";
export type GlassElevation = 0 | 1 | 2 | 3;

export type GlassSurfaceAs =
  | "div"
  | "section"
  | "aside"
  | "nav"
  | "header"
  | "footer"
  | "button";

// Loose base — events use HTMLElement so they unify across div/button/section.
// Button-specific attrs we use are added explicitly.
type GlassBaseProps = Omit<HTMLAttributes<HTMLElement>, "children">;

export interface GlassSurfaceProps extends GlassBaseProps {
  as?: GlassSurfaceAs;
  tint?: GlassTint;
  blur?: GlassBlur;
  rim?: boolean;
  specular?: boolean;
  press?: boolean;
  elevation?: GlassElevation;
  className?: string;
  children: ReactNode;
  // Button-specific attrs (used when as="button"):
  type?: "button" | "submit" | "reset";
  disabled?: boolean;
  form?: string;
  name?: string;
  value?: string | readonly string[] | number;
  autoFocus?: boolean;
}

const tintClass: Record<GlassTint, string> = {
  warm: "glass-warm",
  body: "",
  cool: "glass-cool",
  clear: "glass-clear",
};

const blurClass: Record<GlassBlur, string> = {
  xs: "glass-xs",
  sm: "glass-sm",
  md: "glass-md",
  lg: "glass-lg",
  xl: "glass-xl",
  "2xl": "glass-2xl",
};

const elevationShadow: Record<GlassElevation, string> = {
  0: "",
  1: "shadow-card",
  2: "shadow-soft",
  3: "shadow-lifted",
};

export function glassSurfaceClassName({
  tint = "body",
  blur = "lg",
  rim = false,
  specular = false,
  press = false,
  elevation = 1,
  className,
}: Pick<
  GlassSurfaceProps,
  "tint" | "blur" | "rim" | "specular" | "press" | "elevation" | "className"
> = {}) {
  return cn(
    "glass",
    tintClass[tint],
    blurClass[blur],
    rim && "glass-rim",
    specular && "glass-specular",
    press && "glass-press",
    elevationShadow[elevation],
    className,
  );
}

export const GlassSurface = forwardRef<HTMLElement, GlassSurfaceProps>(
  function GlassSurface(props, ref) {
    const {
      as = "div",
      tint = "body",
      blur = "lg",
      rim = false,
      specular = false,
      press = false,
      elevation = 1,
      className,
      children,
      ...rest
    } = props;

    const composedClass = glassSurfaceClassName({
      tint,
      blur,
      rim,
      specular,
      press,
      elevation,
      className,
    });

    if (specular || press) {
      return (
        <InteractiveGlassSurface
          as={as}
          className={composedClass}
          press={press}
          specular={specular}
          ref={ref as ForwardedRef<HTMLElement>}
          {...rest}
        >
          {children}
        </InteractiveGlassSurface>
      );
    }

    const Tag = as as "div";
    const elementProps: Record<string, unknown> = {
      "data-glass": "true",
      className: composedClass,
      ref,
      ...rest,
    };
    if (as === "button" && !("type" in rest)) {
      elementProps.type = "button";
    }
    return <Tag {...(elementProps as ComponentPropsWithoutRef<"div">)}>{children}</Tag>;
  },
);
