import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function sanitizeBarcode(code: string): string {
  return code.replace(/[^0-9A-Za-z]/g, "").trim();
}

interface ProductInfo {
  barcode: string;
  name: string;
  brand?: string;
  category?: string;
  quantity?: string;
  source: string;
}

async function lookupOpenFoodFacts(barcode: string): Promise<ProductInfo | null> {
  try {
    const res = await fetch(
      `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(barcode)}.json?fields=code,product_name,brands,categories,quantity,status`,
      {
        headers: { "User-Agent": "EcoReceipt/1.0 (self-checkout-barcode)" },
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
      source: "openfoodfacts",
    };
  } catch {
    return null;
  }
}

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
    // Ignore
  }
  return null;
}

// GET: Public endpoint — barcode lookup for self-checkout customers
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ shopId: string; code: string }> }
) {
  try {
    const { shopId, code } = await params;
    const barcode = sanitizeBarcode(code);

    if (!barcode || barcode.length < 4) {
      return NextResponse.json({ error: "Invalid barcode" }, { status: 400 });
    }

    // Check shop exists
    const shop = await prisma.shop.findUnique({
      where: { id: shopId },
      select: { id: true },
    });

    if (!shop) {
      return NextResponse.json({ error: "Shop not found" }, { status: 404 });
    }

    // Look up in shop inventory first
    const item = await prisma.item.findFirst({
      where: {
        shopId,
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

    // Try external databases
    const [offResult, upcResult] = await Promise.all([
      lookupOpenFoodFacts(barcode),
      lookupUPCItemDB(barcode),
    ]);

    const product = offResult || upcResult;

    if (product) {
      return NextResponse.json({
        found: false,
        source: product.source,
        product,
      });
    }

    return NextResponse.json({ found: false, source: "none" }, { status: 200 });
  } catch (error) {
    console.error("Self-checkout barcode lookup error:", error);
    return NextResponse.json({ error: "Failed barcode lookup" }, { status: 500 });
  }
}
