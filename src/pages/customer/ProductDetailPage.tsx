import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  ShoppingBag,
  Zap,
  ShieldCheck,
  Truck,
  RotateCcw,
  Plus,
  Minus,
  Check,
  AlertCircle,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { Product } from '../../types/database.types';
import { ImageGallery } from '../../components/customer/ImageGallery';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { useCart } from '../../context/CartContext';

export const ProductDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { addToCart } = useCart();

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      fetchProduct(id);
    }
  }, [id]);

  const fetchProduct = async (productId: string) => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          product_images (
            id,
            image_path,
            image_url,
            display_order,
            created_at
          )
        `)
        .eq('id', productId)
        .single();

      if (error) throw error;
      setProduct(data);
    } catch (err: any) {
      console.error('Error fetching product:', err);
      setErrorMsg(err.message || 'Product not found or unavailable.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = () => {
    if (!product || product.stock_quantity <= 0) return;
    const ok = addToCart(product, quantity);
    if (ok) {
      setAdded(true);
      setTimeout(() => setAdded(false), 2000);
    }
  };

  const handleBuyNow = () => {
    if (!product || product.stock_quantity <= 0) return;
    addToCart(product, quantity);
    navigate('/customer/checkout');
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <LoadingSpinner size="lg" text="Loading product details..." />
      </div>
    );
  }

  if (errorMsg || !product) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 font-display">Product Unavailable</h2>
        <p className="text-sm text-slate-500 max-w-md mx-auto">
          {errorMsg || 'The requested product could not be located in the catalog.'}
        </p>
        <Link
          to="/customer"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 text-white font-semibold text-sm hover:bg-indigo-700 shadow-md shadow-indigo-600/20"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Collection
        </Link>
      </div>
    );
  }

  const isOutOfStock = product.stock_quantity <= 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      {/* Back button */}
      <div className="mb-6">
        <Link
          to="/customer"
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-indigo-600 transition-colors uppercase tracking-wider"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Catalog
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16">
        {/* Gallery */}
        <div>
          <ImageGallery
            images={product.product_images}
            productName={product.name}
          />
        </div>

        {/* Product Details & Actions */}
        <div className="flex flex-col justify-start space-y-6">
          <div>
            <span className="inline-block px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-widest bg-indigo-50 text-indigo-700 mb-3">
              {product.category}
            </span>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight font-display leading-tight">
              {product.name}
            </h1>
            <div className="mt-4 flex items-baseline gap-4">
              <span className="text-3xl font-extrabold text-slate-900 font-display">
                ₹{Number(product.price).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
              <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-md">
                Inclusive of all taxes
              </span>
            </div>
          </div>

          {/* Description */}
          <div className="border-t border-b border-slate-100 py-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
              Description
            </h3>
            <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">
              {product.description || 'Crafted with premium high-thread count cotton for everyday durability, tailored comfort, and effortless styling.'}
            </p>
          </div>

          {/* Stock Status */}
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Availability:
            </span>
            {isOutOfStock ? (
              <span className="text-xs font-bold text-rose-600 bg-rose-50 px-2.5 py-1 rounded-md">
                Out of Stock
              </span>
            ) : (
              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                In Stock ({product.stock_quantity} available)
              </span>
            )}
          </div>

          {/* Quantity Selector */}
          {!isOutOfStock && (
            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                Quantity
              </label>
              <div className="flex items-center gap-3">
                <div className="flex items-center border border-slate-200 rounded-xl bg-slate-50 overflow-hidden shadow-sm">
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    disabled={quantity <= 1}
                    className="p-3 text-slate-600 hover:bg-slate-200 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="w-12 text-center text-sm font-bold text-slate-900 font-mono">
                    {quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => Math.min(product.stock_quantity, q + 1))}
                    disabled={quantity >= product.stock_quantity}
                    className="p-3 text-slate-600 hover:bg-slate-200 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                <span className="text-xs text-slate-400">
                  Subtotal: <strong className="text-slate-800">₹{(Number(product.price) * quantity).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>
                </span>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              onClick={handleAddToCart}
              disabled={isOutOfStock}
              className={`flex-1 py-4 px-6 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-md ${
                added
                  ? 'bg-emerald-600 text-white'
                  : isOutOfStock
                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed shadow-none'
                  : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-600/30'
              }`}
            >
              {added ? (
                <>
                  <Check className="w-5 h-5" />
                  Added to Cart!
                </>
              ) : (
                <>
                  <ShoppingBag className="w-5 h-5" />
                  {isOutOfStock ? 'Sold Out' : 'Add to Cart'}
                </>
              )}
            </button>

            <button
              onClick={handleBuyNow}
              disabled={isOutOfStock}
              className={`flex-1 py-4 px-6 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${
                isOutOfStock
                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                  : 'bg-slate-900 text-white hover:bg-slate-800 shadow-md'
              }`}
            >
              <Zap className="w-5 h-5 text-amber-400" />
              Buy Now
            </button>
          </div>

          {/* Perks & Trust Badges */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4 border-t border-slate-100">
            <div className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-50 text-xs text-slate-700">
              <Truck className="w-4 h-4 text-indigo-600 flex-shrink-0" />
              <span>Complimentary Express Shipping</span>
            </div>
            <div className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-50 text-xs text-slate-700">
              <RotateCcw className="w-4 h-4 text-indigo-600 flex-shrink-0" />
              <span>15-Day Exchange Guarantee</span>
            </div>
            <div className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-50 text-xs text-slate-700">
              <ShieldCheck className="w-4 h-4 text-indigo-600 flex-shrink-0" />
              <span>Razorpay Verified Sandbox</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
