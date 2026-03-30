import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function sanitizeBarcode(code: string): string {
  return code.replace(/[^0-9A-Za-z]/g, "").trim();
}

interface ProductInfo {
  barcode: string;
  name: string;
  brand?: string;
  category?: string;
  quantity?: string;
  mrp?: number;
  indiaMatch?: boolean;
  source: string;
}

// Fallback: Try UPC Item DB (free API)
async function lookupUPCItemDB(barcode: string): Promise<ProductInfo | null> {
  try {
    const res = await fetch(
      `https://api.upcitemdb.com/prod/trial/lookup?upc=${encodeURIComponent(barcode)}`,
      {
        headers: { "User-Agent": "EcoReceipt/1.0" },
        cache: "no-store",
      }
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (data?.items?.[0]) {
      const item = data.items[0];
      return {
        barcode,
        name: item.title || item.brand || "Unknown product",
        brand: item.brand,
        category: item.category,
        source: "upcitemdb",
      };
    }
  } catch {
    // Ignore errors
  }
  return null;
}

// Primary: OpenFoodFacts (good for groceries, India products)
async function lookupOpenFoodFacts(barcode: string): Promise<ProductInfo | null> {
  try {
    const res = await fetch(
      `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(barcode)}.json?fields=code,product_name,brands,categories,quantity,countries_tags,status`,
      {
        headers: { "User-Agent": "EcoReceipt/1.0 (barcode-lookup)" },
        cache: "no-store",
      }
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (data?.status !== 1 || !data?.product) return null;

    const countriesTags: string[] = Array.isArray(data.product.countries_tags)
      ? data.product.countries_tags
      : [];
    const indiaMatch = countriesTags.includes("en:india");

    return {
      barcode,
      name: data.product.product_name || "Unknown product",
      brand: data.product.brands,
      category: data.product.categories,
      quantity: data.product.quantity,
      indiaMatch,
      source: "openfoodfacts",
    };
  } catch {
    // Ignore errors
  }
  return null;
}

// Indian products database (Open Beauty Facts has some Indian products)
async function lookupOpenBeautyFacts(barcode: string): Promise<ProductInfo | null> {
  try {
    const res = await fetch(
      `https://world.openbeautyfacts.org/api/v2/product/${encodeURIComponent(barcode)}.json?fields=code,product_name,brands,categories,quantity,status`,
      {
        headers: { "User-Agent": "EcoReceipt/1.0" },
        cache: "no-store",
      }
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (data?.status !== 1 || !data?.product) return null;

    return {
      barcode,
      name: data.product.product_name || "Unknown product",
      brand: data.product.brands,
      category: data.product.categories,
      quantity: data.product.quantity,
      source: "openbeautyfacts",
    };
  } catch {
    // Ignore errors
  }
  return null;
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { code } = await params;
    const barcode = sanitizeBarcode(code);

    if (!barcode || barcode.length < 6) {
      return NextResponse.json({ error: "Invalid barcode" }, { status: 400 });
    }

    const shop = await prisma.shop.findUnique({
      where: { ownerId: session.user.id },
      select: { id: true },
    });

    if (!shop) {
      return NextResponse.json({ error: "Shop not found" }, { status: 404 });
    }

    // First preference: existing item in this shop inventory.
    const item = await prisma.item.findFirst({
      where: {
        shopId: shop.id,
        isActive: true,
        barcode,
      },
      select: {
        id: true,
        name: true,
        barcode: true,
        price: true,
        category: true,
        unit: true,
        stock: true,
      },
    });

    if (item) {
      return NextResponse.json({
        found: true,
        source: "inventory",
        item,
      });
    }

    // Try multiple external databases in parallel for speed
    const [offResult, upcResult, obfResult] = await Promise.all([
      lookupOpenFoodFacts(barcode),
      lookupUPCItemDB(barcode),
      lookupOpenBeautyFacts(barcode),
    ]);

    // Prefer OpenFoodFacts (better for groceries), then UPC, then OpenBeautyFacts
    const product = offResult || upcResult || obfResult;

    if (product) {
      return NextResponse.json({
        found: false,
        source: product.source,
        product,
      });
    }

    return NextResponse.json({ found: false, source: "none" }, { status: 200 });
  } catch (error) {
    console.error("Barcode lookup error:", error);
    return NextResponse.json({ error: "Failed barcode lookup" }, { status: 500 });
  }
}
