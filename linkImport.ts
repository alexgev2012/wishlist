import { CURRENCY_SYMBOL } from '@/constants';
import type { Currency } from '@/types';

export interface LinkWishDraft {
    title?: string;
    description?: string;
    imageUrl?: string;
    price?: number;
    currency?: Currency;
    url: string;
}

function decodeHtmlEntities(str: string): string {
    return str
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>');
}

function matchMeta(html: string, key: string): string | undefined {
    const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const patterns = [
        new RegExp(`<meta[^>]+(?:property|name)=["']${escapedKey}["'][^>]*content=["']([^"']*)["']`, 'i'),
        new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]*(?:property|name)=["']${escapedKey}["']`, 'i'),
    ];
    for (const re of patterns) {
        const m = html.match(re);
        if (m) return decodeHtmlEntities(m[1]);
    }
    return undefined;
}

function matchTitleTag(html: string): string | undefined {
    const m = html.match(/<title[^>]*>([^<]*)<\/title>/i);
    return m ? decodeHtmlEntities(m[1].trim()) : undefined;
}

function reverseCurrencyLookup(symbolOrCode: string): Currency | undefined {
    const trimmed = symbolOrCode.trim();
    const upper = trimmed.toUpperCase();
    if ((Object.keys(CURRENCY_SYMBOL) as Currency[]).includes(upper as Currency)) return upper as Currency;
    const entry = (Object.entries(CURRENCY_SYMBOL) as [Currency, string][]).find(([, sym]) => sym === trimmed);
    return entry?.[0];
}

interface JsonLdOffer { price?: string | number; priceCurrency?: string }
interface JsonLdProduct {
    '@type'?: string | string[];
    name?: string;
    image?: string | string[];
    description?: string;
    offers?: JsonLdOffer | JsonLdOffer[];
}

function isProductType(type: JsonLdProduct['@type']): boolean {
    if (!type) return false;
    const types = Array.isArray(type) ? type : [type];
    return types.some((t) => typeof t === 'string' && t.includes('Product'));
}

function extractJsonLdProduct(html: string): JsonLdProduct | undefined {
    const blocks = [...html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
    for (const block of blocks) {
        try {
            const parsed: unknown = JSON.parse(block[1]);
            const graph = (parsed as { '@graph'?: unknown[] })?.['@graph'];
            const candidates: unknown[] = Array.isArray(parsed) ? parsed : Array.isArray(graph) ? graph : [parsed];
            for (const candidate of candidates) {
                if (candidate && typeof candidate === 'object' && isProductType((candidate as JsonLdProduct)['@type'])) {
                    return candidate as JsonLdProduct;
                }
            }
        } catch {
            // malformed JSON-LD block — skip it
        }
    }
    return undefined;
}

function firstImage(image: string | string[] | undefined): string | undefined {
    if (!image) return undefined;
    return Array.isArray(image) ? image[0] : image;
}

function firstOffer(offers: JsonLdOffer | JsonLdOffer[] | undefined): JsonLdOffer | undefined {
    if (!offers) return undefined;
    return Array.isArray(offers) ? offers[0] : offers;
}

function scanTextForPrice(html: string): { price: number; currency: Currency } | undefined {
    const symbols = Object.values(CURRENCY_SYMBOL).map((sym) => sym.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    const re = new RegExp(`(${symbols.join('|')})\\s?(\\d[\\d,]*(?:\\.\\d{1,2})?)`);
    const m = html.match(re);
    if (!m) return undefined;
    const currency = reverseCurrencyLookup(m[1]);
    const price = parseFloat(m[2].replace(/,/g, ''));
    if (!currency || isNaN(price)) return undefined;
    return { price, currency };
}

export async function extractWishFromUrl(url: string): Promise<LinkWishDraft> {
    let res: Response;
    try {
        res = await fetch(url);
    } catch {
        throw new Error("Couldn't reach that link. Check your connection or the URL.");
    }
    if (!res.ok) throw new Error(`That page returned an error (${res.status}).`);
    const html = await res.text();

    const ogTitle = matchMeta(html, 'og:title');
    const ogDescription = matchMeta(html, 'og:description') ?? matchMeta(html, 'description');
    const ogImage = matchMeta(html, 'og:image');
    const ogPriceAmount = matchMeta(html, 'og:price:amount') ?? matchMeta(html, 'product:price:amount');
    const ogPriceCurrency = matchMeta(html, 'og:price:currency') ?? matchMeta(html, 'product:price:currency');

    const jsonLd = extractJsonLdProduct(html);
    const jsonLdOffer = firstOffer(jsonLd?.offers);

    const title = ogTitle ?? jsonLd?.name ?? matchTitleTag(html);
    const description = ogDescription ?? jsonLd?.description;
    const imageUrl = ogImage ?? firstImage(jsonLd?.image);

    let price: number | undefined;
    let currency: Currency | undefined;

    if (jsonLdOffer?.price != null) {
        const parsed = typeof jsonLdOffer.price === 'number' ? jsonLdOffer.price : parseFloat(String(jsonLdOffer.price).replace(/,/g, ''));
        if (!isNaN(parsed)) {
            price = parsed;
            currency = jsonLdOffer.priceCurrency ? reverseCurrencyLookup(jsonLdOffer.priceCurrency) : undefined;
        }
    } else if (ogPriceAmount) {
        const parsed = parseFloat(ogPriceAmount.replace(/,/g, ''));
        if (!isNaN(parsed)) {
            price = parsed;
            currency = ogPriceCurrency ? reverseCurrencyLookup(ogPriceCurrency) : undefined;
        }
    }

    if (price == null || currency == null) {
        const scanned = scanTextForPrice(html);
        if (scanned) {
            price = price ?? scanned.price;
            currency = currency ?? scanned.currency;
        }
    }

    return { title, description, imageUrl, price, currency, url };
}
