export const money = (cents) => Math.round(Number(cents) || 0) / 100;

export function product(row) {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    sku: row.sku,
    category: row.category_slug ? { slug: row.category_slug, name: row.category_name } : null,
    shortDescription: row.short_description,
    description: row.description,
    priceCents: row.price_cents,
    price: money(row.price_cents),
    compareAtCents: row.compare_at_cents,
    compareAtPrice: row.compare_at_cents ? money(row.compare_at_cents) : null,
    stock: row.stock,
    inStock: row.stock > 0,
    unit: row.unit,
    logLengthCm: row.log_length_cm,
    volumeM3: row.volume_m3 === null ? null : Number(row.volume_m3),
    woodType: row.wood_type,
    moisture: row.moisture,
    image: row.image_url,
    gallery: row.gallery || [],
    badges: row.badges || [],
    isActive: row.is_active,
    isFeatured: row.is_featured,
    deliveryClass: row.delivery_class,
    weightKg: row.weight_kg,
    position: row.position,
    rating: row.rating ? Number(row.rating) : null,
    reviewCount: row.review_count ? Number(row.review_count) : 0,
    seo: { title: row.seo_title, description: row.seo_description },
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function category(row) {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    tagline: row.tagline,
    description: row.description,
    image: row.image_url,
    position: row.position,
    productCount: row.product_count ? Number(row.product_count) : undefined,
    seo: { title: row.seo_title, description: row.seo_description },
  };
}

export function order(row, items = []) {
  return {
    id: row.id,
    reference: row.reference,
    email: row.email,
    customerName: row.customer_name,
    phone: row.phone,
    shippingAddress: row.shipping_address,
    deliveryMethod: row.delivery_method,
    deliveryFeeCents: row.delivery_fee_cents,
    deliveryFee: money(row.delivery_fee_cents),
    subtotalCents: row.subtotal_cents,
    subtotal: money(row.subtotal_cents),
    discountCents: row.discount_cents,
    discount: money(row.discount_cents),
    discountCode: row.discount_code,
    totalCents: row.total_cents,
    total: money(row.total_cents),
    status: row.status,
    paymentMethod: row.payment_method,
    paymentRef: row.payment_ref,
    customerNote: row.customer_note,
    adminNote: row.admin_note,
    trackingNumber: row.tracking_number,
    paidAt: row.paid_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    items: items.map((i) => ({
      id: i.id,
      productId: i.product_id,
      slug: i.product_slug,
      name: i.name,
      image: i.image_url,
      unitPriceCents: i.unit_price_cents,
      unitPrice: money(i.unit_price_cents),
      quantity: i.quantity,
      lineTotalCents: i.line_total_cents,
      lineTotal: money(i.line_total_cents),
    })),
  };
}

export function blogPost(row, { withContent = true } = {}) {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    excerpt: row.excerpt,
    ...(withContent ? { content: row.content } : {}),
    cover: row.cover_url,
    author: row.author,
    category: row.category,
    tags: row.tags || [],
    status: row.status,
    readMinutes: row.read_minutes,
    publishedAt: row.published_at,
    seo: { title: row.seo_title, description: row.seo_description },
    updatedAt: row.updated_at,
  };
}

export function faq(row) {
  return { id: row.id, question: row.question, answer: row.answer, category: row.category, position: row.position };
}

export function cartTotals(items, deliveryFee = 0, discountCents = 0) {
  const subtotalCents = items.reduce((sum, i) => sum + i.price_cents * i.quantity, 0);
  const totalCents = Math.max(0, subtotalCents + deliveryFee - discountCents);
  return { subtotalCents, deliveryFeeCents: deliveryFee, discountCents, totalCents };
}
