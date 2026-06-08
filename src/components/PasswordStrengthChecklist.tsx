import { CheckCircleIcon } from "@heroicons/react/24/solid";

export type PasswordRequirement = {
  id: string;
  label: string;
  test: (password: string) => boolean;
};

export const PASSWORD_REQUIREMENTS: PasswordRequirement[] = [
  {
    id: "length",
    label: "At least 8 characters",
    test: (password) => password.length >= 8,
  },
  {
    id: "lowercase",
    label: "At least one lowercase letter",
    test: (password) => /[a-z]/.test(password),
  },
  {
    id: "uppercase",
    label: "At least one uppercase letter",
    test: (password) => /[A-Z]/.test(password),
  },
  {
    id: "digit",
    label: "At least one digit",
    test: (password) => /\d/.test(password),
  },
  {
    id: "special",
    label: "At least one special character",
    test: (password) => /[^a-zA-Z0-9]/.test(password),
  },
];

export function isPasswordStrong(password: string): boolean {
  return PASSWORD_REQUIREMENTS.every((requirement) => requirement.test(password));
}

type PasswordStrengthChecklistProps = {
  password: string;
};

export default function PasswordStrengthChecklist({ password }: PasswordStrengthChecklistProps) {
  return (
    <ul className="mt-2 space-y-1" aria-label="Password requirements">
      {PASSWORD_REQUIREMENTS.map((requirement) => {
        const met = requirement.test(password);

        return (
          <li
            key={requirement.id}
            className={`flex items-center gap-1.5 text-xs ${
              met ? "text-emerald-600" : "text-slate-500"
            }`}
          >
            {met ? (
              <CheckCircleIcon className="h-4 w-4 shrink-0" aria-hidden />
            ) : (
              <span className="inline-flex h-4 w-4 shrink-0 items-center justify-center text-[10px] leading-none">
                ○
              </span>
            )}
            <span>{requirement.label}</span>
          </li>
        );
      })}
    </ul>
  );
}
