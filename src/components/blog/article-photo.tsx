"use client";

import styled from "styled-components";

type ArticlePhotoProps = {
  src?: string;
  alt?: string;
  ctaLabel?: string;
  pageText?: string;
};

/**
 * Poza articolului cu animație de tip „carte care se deschide” la hover.
 * Refolosibilă (Blog + ulterior categorii). Bazată pe efectul din
 * fostul `photo-animation.jsx`, adaptat: copertă = poza, iar la deschidere se
 * dezvăluie un panou cu CTA „Citește articolul”.
 */
export function ArticlePhoto({
  src,
  alt = "",
  ctaLabel = "Citește articolul",
  pageText = "text",
}: ArticlePhotoProps) {
  return (
    <StyledWrapper>
      <div className="book">
        <span className="cta">{ctaLabel}</span>
        <div className="inner">
          <span className="page-text">{pageText}</span>
        </div>
        <div className="cover">
          {src ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img alt={alt} src={src} />
          ) : (
            <span className="placeholder">POZA</span>
          )}
        </div>
      </div>
    </StyledWrapper>
  );
}

const StyledWrapper = styled.div`
  width: 100%;
  height: 100%;

  .book {
    position: relative;
    width: 100%;
    height: 100%;
    perspective: 900px;
    transition: transform 0.5s ease;
  }

  .cover,
  .inner,
  .cta {
    position: absolute;
    inset: 0;
    border-radius: 1rem;
    display: flex;
    align-items: center;
    justify-content: center;
    text-align: center;
    overflow: hidden;
  }

  /* Stratul de bază, dezvăluit la deschiderea copertei */
  .cta {
    background: var(--smart-teal, #1f6f78);
    color: #fff;
    padding: 0.75rem;
    font-size: 0.8rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.14em;
    line-height: 1.4;
  }

  /* Pagina care iese, cu text (efectul de carte) */
  .inner {
    background: #f7f1e6;
    transform-origin: right center;
    box-shadow: 1px 1px 12px rgba(3, 17, 28, 0.35);
    transition: all 0.5s ease;
  }

  .page-text {
    padding: 0.75rem;
    font-size: 0.8rem;
    line-height: 1.5;
    color: rgba(10, 21, 32, 0.82);
  }

  /* Coperta = poza articolului */
  .cover {
    background: #dfe1e3;
    cursor: pointer;
    transform-origin: left center;
    box-shadow: 1px 1px 12px rgba(3, 17, 28, 0.35);
    transition: all 0.5s ease;
  }

  .cover img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .placeholder {
    font-size: 0.75rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.18em;
    color: rgba(10, 21, 32, 0.4);
  }

  .book:hover {
    transform: rotateZ(-3deg);
  }

  .book:hover .cover {
    transform: rotateY(-72deg);
  }

  .book:hover .inner {
    transform: rotateZ(20deg) rotateX(-28deg) rotateY(-10deg) translateX(86%);
    box-shadow: 1px 1px 20px rgba(0, 0, 0, 0.42);
  }
`;
