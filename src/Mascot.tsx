import { useId } from "react";
export function Mascot({
  size = 150,
  variant = "hello",
}: {
  size?: number;
  variant?: string;
}) {
  const gradientId = useId();
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 240 240"
      fill="none"
      role="img"
      aria-label="小屿，一朵戴围巾的小云"
    >
      <defs>
        <linearGradient id={gradientId} x1="66" y1="53" x2="170" y2="185">
          <stop stopColor="#fffef7" />
          <stop offset="1" stopColor="#eeeae0" />
        </linearGradient>
      </defs>
      <ellipse cx="120" cy="205" rx="66" ry="9" fill="#344d38" opacity=".07" />
      <path
        d="M55 170C28 150 40 119 61 115C49 74 85 49 113 67C135 30 182 48 183 83C221 83 223 128 200 141C214 175 186 193 159 183C142 208 108 201 96 184C75 198 52 191 55 170Z"
        fill={`url(#${gradientId})`}
        stroke="#dddcd0"
        strokeWidth="2"
      />
      <path
        d="M70 160Q120 188 174 158L179 174Q127 207 69 176Z"
        fill="#9bad8c"
      />
      <path d="M151 177L173 178L177 203Q164 209 154 198Z" fill="#8fa47e" />
      <ellipse cx="93" cy="131" rx="4" ry="5" fill="#535b45" />
      <ellipse cx="151" cy="131" rx="4" ry="5" fill="#535b45" />
      <path
        d={
          variant === "rest"
            ? "M110 148Q122 144 134 148"
            : "M111 145Q122 157 133 145"
        }
        stroke="#535b45"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <ellipse cx="79" cy="144" rx="10" ry="5" fill="#e5b8a2" opacity=".6" />
      <ellipse cx="167" cy="144" rx="10" ry="5" fill="#e5b8a2" opacity=".6" />
      <path d="M32 77l4-10 4 10 10 4-10 4-4 10-4-10-10-4Z" fill="#d7bb79" />
      <path d="M201 181l3-7 3 7 7 3-7 3-3 7-3-7-7-3Z" fill="#d7bb79" />
    </svg>
  );
}
export function Garden() {
  return (
    <svg viewBox="0 0 400 100" aria-hidden="true">
      <path d="M0 79Q80 45 160 75T400 65V100H0Z" fill="#e6e9d9" />
      <path d="M0 96Q120 68 210 86T400 82V100H0Z" fill="#d4ddc4" />
      <g stroke="#7f946c" strokeWidth="2" fill="#a0af87">
        <path d="M55 86V51M55 68Q30 65 35 47Q57 47 55 68M55 62Q80 60 76 42Q53 41 55 62M333 85V40M333 66Q307 62 310 45Q333 45 333 66M333 55Q355 53 353 33Q332 33 333 55" />
      </g>
      <g fill="#e7c5a8">
        <circle cx="99" cy="78" r="5" />
        <circle cx="291" cy="76" r="4" />
      </g>
    </svg>
  );
}
