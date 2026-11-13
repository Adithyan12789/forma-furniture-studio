import { Link } from 'react-router-dom';
import {
  ArrowRight, Box, Camera, Download, Layers, ScanEye, SlidersHorizontal,
} from 'lucide-react';
import { FURNITURE_CATEGORIES } from '@shared/constants/furniture';

const STEPS = [
  { icon: Camera, title: 'Upload a photo', text: 'Any chair, sofa, table or cabinet — JPEG, PNG or WebP.' },
  { icon: ScanEye, title: 'AI reads the piece', text: 'A vision model extracts category, materials, colors, dimensions and components as validated JSON. It never builds geometry.' },
  { icon: Box, title: 'Our engine builds it', text: 'Procedural Three.js generators construct real, editable meshes from the extracted configuration.' },
  { icon: SlidersHorizontal, title: 'Customize & export', text: 'Resize it, re-finish it, swap components — then export GLB/GLTF with materials intact.' },
];

export default function LandingPage() {
  return (
    <div className="mx-auto max-w-6xl px-6 pb-24">
      <section className="pb-16 pt-20 text-center">
        <p className="mb-5 text-[11px] font-semibold uppercase tracking-[0.3em] text-brass">
          Photo in · 3D model out
        </p>
        <h1 className="mx-auto max-w-3xl font-display text-5xl font-semibold leading-[1.05] tracking-tight md:text-6xl">
          Furniture, rebuilt in 3D from a single photograph.
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-mist">
          AI analyzes the image. Our own procedural geometry engine — not an
          image-to-3D service — builds a realistic, fully editable model you
          can resize, re-material and export.
        </p>
        <div className="mt-9 flex items-center justify-center gap-3">
          <Link
            to="/studio"
            className="inline-flex items-center gap-2 rounded-lg bg-brass px-5 py-3 text-sm font-semibold text-black transition hover:bg-[#e6cb9c]"
          >
            Open the Studio <ArrowRight size={16} />
          </Link>
          <a
            href="#how"
            className="rounded-lg border border-line px-5 py-3 text-sm font-medium text-zinc-200 transition hover:bg-panel2"
          >
            How it works
          </a>
        </div>
      </section>

      <section id="how" className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {STEPS.map((s, i) => (
          <div key={s.title} className="rounded-2xl border border-line bg-panel p-5">
            <div className="flex items-center justify-between">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-brass/12 text-brass">
                <s.icon size={19} />
              </span>
              <span className="font-display text-sm text-zinc-600">0{i + 1}</span>
            </div>
            <h3 className="mt-4 font-display text-base font-semibold">{s.title}</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-mist">{s.text}</p>
          </div>
        ))}
      </section>

      <section className="mt-16 rounded-2xl border border-line bg-panel p-7">
        <div className="flex items-center gap-2.5">
          <Layers size={17} className="text-brass" />
          <h2 className="font-display text-lg font-semibold">Supported furniture</h2>
        </div>
        <p className="mt-1.5 text-sm text-mist">
          Each category maps to its own procedural generator — all nine
          generators are live in the Studio today.
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          {FURNITURE_CATEGORIES.map((c) => (
            <span
              key={c.id}
              className="rounded-full border border-brass/40 bg-brass/10 px-3 py-1.5 text-xs text-brass"
            >
              {c.label} · live
            </span>
          ))}
        </div>
      </section>

      <section className="mt-16 flex flex-col items-center rounded-2xl border border-brass/25 bg-gradient-to-b from-brass/10 to-transparent p-10 text-center">
        <Download size={22} className="text-brass" />
        <h2 className="mt-3 font-display text-2xl font-semibold">See a real procedural model, right now</h2>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-mist">
          The Studio opens on a wooden dining chair generated entirely from
          code — every leg, slat and stretcher — with eight more furniture
          generators one click away. Drag to orbit, resize, re-material.
        </p>
        <Link
          to="/studio"
          className="mt-6 inline-flex items-center gap-2 rounded-lg bg-brass px-5 py-3 text-sm font-semibold text-black transition hover:bg-[#e6cb9c]"
        >
          Launch Studio <ArrowRight size={16} />
        </Link>
      </section>

      <footer className="mt-16 border-t border-line pt-6 text-center text-xs text-zinc-500">
        Forma · AI analyzes, geometry builds. No image-to-3D services, ever.
      </footer>
    </div>
  );
}
