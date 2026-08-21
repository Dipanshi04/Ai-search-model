/**
 * Logo Component - Shared across all ISA Marathon applications
 * Simple, performant logo rendering with responsive sizing
 */

import React, { ReactNode } from 'react';

export type LogoSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
export type LogoTheme = 'light' | 'dark';

export interface LogoProps {
  /**
   * Size preset: xs(24px), sm(32px), md(40px), lg(48px), xl(64px), 2xl(80px)
   * @default 'md'
   */
  size?: LogoSize;

  /**
   * Color theme for optimized contrast
   * @default 'light'
   */
  theme?: LogoTheme;

  /**
   * Additional CSS classes for customization
   */
  className?: string;

  /**
   * Click handler
   */
  onClick?: (() => void) | undefined;

  /**
   * Display as link to home/dashboard
   * @default false
   */
  isLink?: boolean;

  /**
   * Custom href for link
   * @default '/'
   */
  href?: string;
}

const SIZES: Record<LogoSize, string> = {
  xs: 'h-6',
  sm: 'h-8',
  md: 'h-10',
  lg: 'h-12',
  xl: 'h-16',
  '2xl': 'h-20',
};

const OPACITY: Record<LogoTheme, string> = {
  light: 'opacity-100',
  dark: 'opacity-90',
};

export const Logo: React.FC<LogoProps> = ({
  size = 'md',
  theme = 'light',
  className = '',
  onClick = undefined,
  isLink = false,
  href = '/',
}): React.ReactElement => {
  const sizeClass = SIZES[size as LogoSize] || SIZES.md;
  const opacityClass = OPACITY[theme as LogoTheme] || OPACITY.light;
  
  const classes = `${sizeClass} w-auto ${opacityClass} transition-opacity ${className}`.trim();

  const logoSrc = theme === 'dark' ? '/logo-light.png' : '/logo-dark.png';
  
  const logoContent: ReactNode = (
    <img
      src={logoSrc}
      alt="ISA Marathon"
      className={classes}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
    />
  );

  if (isLink) {
    return (
      <a
        href={href}
        onClick={(e) => {
          e.preventDefault();
          onClick?.();
        }}
        className="inline-flex items-center"
        title="ISA Marathon - Home"
      >
        {logoContent}
      </a>
    );
  }

  return (
    <div onClick={onClick} className="inline-flex items-center">
      {logoContent}
    </div>
  );
};

export default Logo;
