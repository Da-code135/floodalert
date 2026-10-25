import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Camera, Database, ExternalLink } from "lucide-react";

export const metadata: Metadata = {
  title: "Credits & data sources",
  description:
    "Photo credits, boundary data attribution and open-source acknowledgements for the FloodAlert prototype.",
};

const PHOTOS = [
  {
    file: "flood-1.jpg",
    title: "Flooding in Bwaise — Africa on the move 03",
    credit: "Fiktube",
    alt: "A flooded market street in Bwaise with boda riders moving through brown water",
    source:
      "https://commons.wikimedia.org/wiki/File:Flooding_in_Bwaise_but_still_couldn%E2%80%99t_stop_transportation-Africa_on_the_move_03.jpg",
  },
  {
    file: "flood-2.jpg",
    title: "Flooding in Bwaise — Africa on the move 01",
    credit: "Fiktube",
    alt: "Flooded Bwaise street with motorcycles and pedestrians",
    source:
      "https://commons.wikimedia.org/wiki/File:Flooding_in_Bwaise_but_still_couldn%E2%80%99t_stop_transportation-Africa_on_the_move_01.jpg",
  },
  {
    file: "flood-3.jpg",
    title: "Flooded road Uganda",
    credit: "Elisha Muwanguzi",
    alt: "A flooded road in Uganda with vehicles moving through water",
    source: "https://commons.wikimedia.org/wiki/File:Flooded_road_Uganda.jpg",
  },
  {
    file: "flood-4.jpg",
    title: "Kampala Flooding",
    credit: "Chad.staddon",
    alt: "Three children standing in floodwater outside a brick home in Kampala",
    source: "https://commons.wikimedia.org/wiki/File:Kampala_Flooding.jpg",
  },
  {
    file: "flood-5.jpg",
    title: "Moment of a life saver at the right time",
    credit: "Jameswasswa",
    alt: "Boda riders pushing motorcycles through fast brown floodwater",
    source:
      "https://commons.wikimedia.org/wiki/File:Moment_of_a_life_saver_at_the_right_time.jpg",
  },
  {
    file: "flood-6.jpg",
    title: "The strong and brave ones will always try to pass through",
    credit: "Jameswasswa",
    alt: "Boda riders crossing a flooded road",
    source:
      "https://commons.wikimedia.org/wiki/File:The_strong_and_brave_ones_will_always_try_to_pass_through.jpg",
  },
];

export default function CreditsPage() {
  return (
    <div className="container-page py-8 sm:py-10">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-[10px] font-medium text-mist transition hover:text-foam"
      >
        <ArrowLeft className="size-3" aria-hidden />
        Back to dashboard
      </Link>

      <div className="mt-5 max-w-3xl">
        <p className="eyebrow flex items-center gap-2">
          <span className="h-px w-6 bg-aqua/60" />
          Credits · attribution · licences
        </p>
        <h1 className="mt-3 font-display text-[34px] font-semibold leading-[1.02] tracking-[-0.035em] text-foam sm:text-[44px]">
          Built on open data,{" "}
          <span className="text-gradient-water">shared honestly.</span>
        </h1>
        <p className="mt-3 text-[13px] leading-relaxed text-mist">
          The demo uses real Kampala division boundaries and openly licensed
          flood photography. The reports, alerts, subscriber circles and
          response times are seeded demo data, not real records.
        </p>
      </div>

      <section className="mt-8">
        <div className="flex items-center gap-2">
          <Camera className="size-4 text-aqua" aria-hidden />
          <h2 className="font-display text-lg font-semibold text-foam">
            Demo photography
          </h2>
          <span className="rounded border border-line bg-white/4 px-1.5 py-0.5 text-[8px] text-mist">
            CC BY-SA 4.0
          </span>
        </div>
        <p className="mt-1 max-w-2xl text-[11px] leading-relaxed text-mist">
          These photos are illustrative. They are not evidence for the specific
          reports shown in the interface. If you reuse them, keep the credit and
          share alike under the same licence.
        </p>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {PHOTOS.map((photo) => (
            <figure
              key={photo.file}
              className="group overflow-hidden rounded-xl border border-line bg-white/[0.02]"
            >
              <div className="relative aspect-[4/3] overflow-hidden">
                <Image
                  src={`/demo/${photo.file}`}
                  alt={photo.alt}
                  fill
                  className="object-cover transition duration-500 group-hover:scale-[1.02]"
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                />
                <span className="absolute left-2.5 top-2.5 rounded bg-black/55 px-1.5 py-0.5 text-[8px] font-medium text-white/80 backdrop-blur">
                  Demo photo
                </span>
              </div>
              <figcaption className="p-3.5">
                <p className="text-[10px] font-medium leading-snug text-foam">
                  {photo.title}
                </p>
                <p className="mt-1 text-[9px] text-mist">
                  {photo.credit} · CC BY-SA 4.0
                </p>
                <a
                  href={photo.source}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-1.5 inline-flex items-center gap-1 text-[8px] text-aqua transition hover:text-foam"
                >
                  Wikimedia Commons source
                  <ExternalLink className="size-2.5" aria-hidden />
                </a>
              </figcaption>
            </figure>
          ))}
        </div>
      </section>

      <section className="mt-10 grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-line bg-white/[0.02] p-5">
          <div className="flex items-center gap-2">
            <Database className="size-4 text-lime" aria-hidden />
            <h2 className="font-display text-sm font-semibold text-foam">
              Boundary data
            </h2>
          </div>
          <p className="mt-2 text-[10px] leading-relaxed text-mist">
            Kampala division boundaries are simplified from geoBoundaries
            UGA ADM4 (2020), sourced from UNHCR Operational Data Portal. The
            five divisions — Kawempe, Lubaga, Kampala Central, Makindye and
            Nakawa — are used for the risk choropleth, labels and map
            interactions.
          </p>
          <ul className="mt-3 space-y-1.5 text-[9px] text-mist">
            <li>
              <span className="text-foam">Licence:</span> CC BY 3.0 IGO
            </li>
            <li>
              <span className="text-foam">Source:</span>{" "}
              <a
                href="https://www.geoboundaries.org/"
                target="_blank"
                rel="noreferrer"
                className="text-aqua hover:text-foam"
              >
                geoBoundaries
              </a>
            </li>
            <li>
              <span className="text-foam">Modification:</span> coordinates
              rounded to five decimal places; geometry clipped in the map
              projection.
            </li>
          </ul>
        </div>

        <div className="rounded-2xl border border-line bg-white/[0.02] p-5">
          <h2 className="font-display text-sm font-semibold text-foam">
            Open-source & platform acknowledgements
          </h2>
          <ul className="mt-2.5 grid gap-2 text-[9px] leading-relaxed text-mist sm:grid-cols-2">
            <li>
              <span className="text-foam">Next.js</span> · MIT · React framework
            </li>
            <li>
              <span className="text-foam">Tailwind CSS</span> · MIT
            </li>
            <li>
              <span className="text-foam">Lucide</span> · ISC · icons
            </li>
            <li>
              <span className="text-foam">Inter & Space Grotesk</span> · SIL OFL
            </li>
            <li>
              <span className="text-foam">Gemini 2.5 Flash</span> · Google AI
            </li>
            <li>
              <span className="text-foam">Firebase / Firestore</span> · Google
            </li>
            <li>
              <span className="text-foam">Google Cloud Run</span> · Google Cloud
            </li>
            <li>
              <span className="text-foam">OpenStreetMap</span> · reference for
              road alignment
            </li>
          </ul>
          <p className="mt-3 border-t border-line pt-3 text-[8px] leading-relaxed text-mist/60">
            FloodAlert is an independent hackathon prototype. It is not
            affiliated with or endorsed by KCCA, the Uganda Red Cross Society,
            the United Nations, Google or Wikimedia. Emergency numbers are
            provided for context; always call 999 first.
          </p>
        </div>
      </section>

      <p className="mt-8 text-[9px] text-mist/50">
        See the full machine-readable attribution in{" "}
        <a
          href="/demo/ATTRIBUTION.md"
          target="_blank"
          rel="noreferrer"
          className="text-aqua/70 hover:text-aqua"
        >
          public/demo/ATTRIBUTION.md
        </a>
        .
      </p>
    </div>
  );
}
