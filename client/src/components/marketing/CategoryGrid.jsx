import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import { motion } from 'framer-motion';

export default function CategoryGrid({ categories = [] }) {
  if (!categories.length) return null;
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {categories.map((category, index) => (
        <motion.div
          key={category.slug}
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, delay: index * 0.06 }}
        >
          <Link
            to={`/categorie/${category.slug}`}
            className="group relative flex h-full min-h-[220px] flex-col justify-end overflow-hidden rounded-3xl bg-forest-900 p-5 text-white"
          >
            <img
              src={category.image}
              alt=""
              loading="lazy"
              className="absolute inset-0 h-full w-full object-cover opacity-70 transition duration-700 group-hover:scale-105 group-hover:opacity-80"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-forest-950/90 via-forest-950/30 to-transparent" />
            <div className="relative">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ember-300">{category.tagline}</p>
              <h3 className="mt-1.5 font-display text-xl font-semibold">{category.name}</h3>
              <p className="mt-1 text-xs text-white/65">{category.productCount} référence{category.productCount > 1 ? 's' : ''}</p>
              <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-white/85">
                Explorer <ArrowUpRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </span>
            </div>
          </Link>
        </motion.div>
      ))}
    </div>
  );
}
