/**
 * AuthLayout — a small centered card used by every auth screen. Styling is scoped inline
 * (this feature does not own `@/app/styles.css`, which is A9's). Form controls themselves come
 * from the design system (`@/components`), so they inherit the app's `ds-*` styles.
 */
import type { CSSProperties, ReactNode } from 'react';

const wrap: CSSProperties = {
  display: 'flex',
  justifyContent: 'center',
  padding: '3rem 1rem',
};

const card: CSSProperties = {
  width: '100%',
  maxWidth: 400,
  border: '1px solid rgba(128,128,128,0.3)',
  borderRadius: 10,
  padding: '2rem',
  boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
};

const heading: CSSProperties = {
  margin: '0 0 1.25rem',
  fontSize: '1.4rem',
};

const footer: CSSProperties = {
  marginTop: '1.5rem',
  fontSize: '0.9rem',
  display: 'flex',
  flexDirection: 'column',
  gap: '0.5rem',
};

export function AuthLayout(props: {
  title: string;
  children: ReactNode;
  footer?: ReactNode;
}): JSX.Element {
  return (
    <div style={wrap}>
      <section style={card} aria-labelledby="auth-title">
        <h1 id="auth-title" style={heading}>
          {props.title}
        </h1>
        {props.children}
        {props.footer ? <div style={footer}>{props.footer}</div> : null}
      </section>
    </div>
  );
}

/** Consistent spacing for a stack of form fields / actions. */
export const stack: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '1rem',
};
