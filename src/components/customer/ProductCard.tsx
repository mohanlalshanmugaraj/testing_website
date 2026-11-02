import React from 'react';
import { Link } from 'react-router-dom';
import { ShoppingBag, Eye, Check } from 'lucide-react';
import type { Product } from '../../types/database.types';
import { useCart } from '../../context/CartContext';

interface ProductCardProps {
  product: Product;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const { addToCart, items } = useCart();
  const [added, setAdded] = React.useState(false);

  // Find primary image (lowest display_order or first)
  const sortedImages = [...(product.product_images || [])].sort(
    (a, b) => a.display_order - b.display_order
  );
  const primaryImage =
    sortedImages.length > 0
      ? sortedImages[0].image_url
      : 'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?auto=format&fit=crop&w=600&q=80';

  const cartItem = items.find((item) => item.product.id === product.id);
  const currentInCart = cartItem?.quantity || 0;
  const isOutOfStock = product.stock_quantity <= 0;
  const isMaxInCart = currentInCart >= product.stock_quantity;

  const handleQuickAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isOutOfStock || isMaxInCart) return;

    const ok = addToCart(product, 1);
    if (ok) {
      setAdded(true);
      setTimeout(() => setAdded(false), 1500);
    }
  };

  return (
    <div className="group relative bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col">
      {/* Product Image */}
      <Link
        to={`/customer/product/${product.id}`}
        className="relative block aspect-[4/5] overflow-hidden bg-slate-100"
      >
        <img
          src={primaryImage}
          alt={product.name}
          loading="lazy"
          className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
        />

        {/* Badges */}
        <div className="absolute top-3 left-3 flex flex-col gap-1.5 z-10">
          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-white/90 backdrop-blur-sm text-slate-800 shadow-sm">
            {product.category}
          </span>
          {isOutOfStock ? (
            <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-500 text-white shadow-sm">
              Out of Stock
            </span>
          ) : product.stock_quantity < 5 ? (
            <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500 text-white shadow-sm">
              Only {product.stock_quantity} left
            </span>
          ) : null}
        </div>

        {/* Hover action overlay */}
        <div className="absolute inset-0 bg-slate-900/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
          <span className="p-3 bg-white text-slate-900 rounded-full shadow-lg transform -translate-y-2 group-hover:translate-y-0 transition-transform">
            <Eye className="w-5 h-5" />
          </span>
        </div>
      </Link>

      {/* Card Body */}
      <div className="p-4 flex flex-col flex-1">
        <Link to={`/customer/product/${product.id}`} className="block">
          <h3 className="font-semibold text-slate-900 text-base group-hover:text-indigo-600 transition-colors line-clamp-1">
            {product.name}
          </h3>
        </Link>
        <p className="mt-1 text-xs text-slate-500 line-clamp-2 leading-relaxed">
          {product.description || 'Premium crafted contemporary apparel.'}
        </p>

        {/* Price & Action */}
        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400 font-medium block">Price</span>
            <span className="text-lg font-extrabold text-slate-900 font-display">
              ₹{Number(product.price).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
          </div>

          <button
            onClick={handleQuickAdd}
            disabled={isOutOfStock || isMaxInCart}
            className={`p-2.5 rounded-xl font-semibold text-xs transition-all flex items-center gap-1.5 ${
              added
                ? 'bg-emerald-600 text-white'
                : isOutOfStock || isMaxInCart
                ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-600 hover:text-white shadow-sm'
            }`}
            title={isOutOfStock ? 'Out of stock' : 'Quick add to cart'}
          >
            {added ? (
              <>
                <Check className="w-4 h-4" />
                <span>Added</span>
              </>
            ) : (
              <>
                <ShoppingBag className="w-4 h-4" />
                <span>{isOutOfStock ? 'Sold Out' : 'Add'}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
