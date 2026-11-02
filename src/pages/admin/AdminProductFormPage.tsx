import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  UploadCloud,
  X,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { ProductImage } from '../../types/database.types';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';

const CATEGORIES = ['T-Shirts', 'Shirts', 'Jackets', 'Trousers', 'Knitwear', 'Accessories'];
const MAX_IMAGES = 5;
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];

interface LocalPreviewImage {
  file: File;
  previewUrl: string;
}

export const AdminProductFormPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const isEditMode = Boolean(id);
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState<string>('999.00');
  const [stockQuantity, setStockQuantity] = useState<string>('20');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [isActive, setIsActive] = useState(true);

  // Existing uploaded images (stored in DB & Storage)
  const [existingImages, setExistingImages] = useState<ProductImage[]>([]);
  // Newly selected files to upload on submit
  const [pendingImages, setPendingImages] = useState<LocalPreviewImage[]>([]);

  const [loading, setLoading] = useState(isEditMode);
  const [saving, setSaving] = useState(false);
  const [uploadProgressText, setUploadProgressText] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isEditMode && id) {
      fetchExistingProduct(id);
    }
  }, [id, isEditMode]);

  const fetchExistingProduct = async (productId: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          product_images (
            id,
            product_id,
            image_path,
            image_url,
            display_order,
            created_at
          )
        `)
        .eq('id', productId)
        .single();

      if (error) throw error;
      if (data) {
        setName(data.name);
        setDescription(data.description || '');
        setPrice(String(data.price));
        setStockQuantity(String(data.stock_quantity));
        setCategory(data.category);
        setIsActive(data.is_active);
        setExistingImages(data.product_images || []);
      }
    } catch (err: any) {
      setErrorMessage('Failed to load product details: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFilesSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const currentTotal = existingImages.length + pendingImages.length;
    if (currentTotal >= MAX_IMAGES) {
      alert(`Maximum ${MAX_IMAGES} images allowed per product.`);
      return;
    }

    const availableSlots = MAX_IMAGES - currentTotal;
    const selectedFiles = Array.from(files).slice(0, availableSlots);

    const newPending: LocalPreviewImage[] = [];

    for (const file of selectedFiles) {
      // Validate MIME type
      if (!ALLOWED_MIME_TYPES.includes(file.type)) {
        alert(`File "${file.name}" is not supported. Please choose JPG, JPEG, PNG, or WebP.`);
        continue;
      }

      // Validate File size (Max 5MB)
      if (file.size > MAX_FILE_SIZE_BYTES) {
        alert(`File "${file.name}" exceeds the maximum 5 MB limit.`);
        continue;
      }

      newPending.push({
        file,
        previewUrl: URL.createObjectURL(file),
      });
    }

    setPendingImages((prev) => [...prev, ...newPending]);

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removePendingImage = (index: number) => {
    setPendingImages((prev) => {
      URL.revokeObjectURL(prev[index].previewUrl);
      return prev.filter((_, i) => i !== index);
    });
  };

  const removeExistingImage = async (image: ProductImage) => {
    const confirmRemoval = window.confirm('Delete this image from storage?');
    if (!confirmRemoval) return;

    try {
      // Remove from storage bucket
      await supabase.storage.from('product-images').remove([image.image_path]);

      // Remove row from DB
      await supabase.from('product_images').delete().eq('id', image.id);

      setExistingImages((prev) => prev.filter((img) => img.id !== image.id));
    } catch (err: any) {
      alert('Failed to remove image: ' + err.message);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const parsedPrice = parseFloat(price);
    const parsedStock = parseInt(stockQuantity, 10);

    if (!name.trim()) {
      setErrorMessage('Product name is required.');
      return;
    }

    if (isNaN(parsedPrice) || parsedPrice < 0) {
      setErrorMessage('Please provide a valid price.');
      return;
    }

    if (isNaN(parsedStock) || parsedStock < 0) {
      setErrorMessage('Please provide a valid stock quantity.');
      return;
    }

    setSaving(true);
    setUploadProgressText('Saving product information...');

    try {
      let productId = id;

      if (isEditMode && productId) {
        // Update product row
        const { error: updateErr } = await supabase
          .from('products')
          .update({
            name: name.trim(),
            description: description.trim() || null,
            price: parsedPrice,
            stock_quantity: parsedStock,
            category,
            is_active: isActive,
            updated_at: new Date().toISOString(),
          })
          .eq('id', productId);

        if (updateErr) throw updateErr;
      } else {
        // Insert new product row
        const { data: inserted, error: insertErr } = await supabase
          .from('products')
          .insert({
            name: name.trim(),
            description: description.trim() || null,
            price: parsedPrice,
            stock_quantity: parsedStock,
            category,
            is_active: isActive,
          })
          .select('id')
          .single();

        if (insertErr || !inserted) throw insertErr;
        productId = inserted.id;
      }

      // Handle uploading any pending images to Supabase Storage
      if (pendingImages.length > 0 && productId) {
        let displayOrder = existingImages.length;

        for (let i = 0; i < pendingImages.length; i++) {
          const item = pendingImages[i];
          setUploadProgressText(`Uploading image ${i + 1} of ${pendingImages.length}...`);

          const fileExt = item.file.name.split('.').pop() || 'jpg';
          const cleanName = item.file.name.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
          const uniquePath = `products/${productId}/${Date.now()}_${cleanName}.${fileExt}`;

          // Upload to Supabase bucket
          const { error: uploadError } = await supabase.storage
            .from('product-images')
            .upload(uniquePath, item.file, {
              cacheControl: '3600',
              upsert: false,
            });

          if (uploadError) {
            console.error('Storage upload error:', uploadError);
            // Continue with other files if one fails
            continue;
          }

          // Retrieve public URL
          const { data: urlData } = supabase.storage
            .from('product-images')
            .getPublicUrl(uniquePath);

          // Save image reference in product_images table
          await supabase.from('product_images').insert({
            product_id: productId,
            image_path: uniquePath,
            image_url: urlData.publicUrl,
            display_order: displayOrder++,
          });
        }
      }

      navigate('/admin/products');
    } catch (err: any) {
      console.error('Save product error:', err);
      setErrorMessage(err.message || 'Failed to save product.');
    } finally {
      setSaving(false);
      setUploadProgressText(null);
    }
  };

  if (loading) {
    return (
      <div className="py-20">
        <LoadingSpinner size="lg" text="Loading product records..." />
      </div>
    );
  }

  const totalImagesCount = existingImages.length + pendingImages.length;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Top back navigation */}
      <div className="flex items-center justify-between">
        <Link
          to="/admin/products"
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-indigo-600 transition-colors uppercase tracking-wider"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Products List
        </Link>
      </div>

      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-display">
          {isEditMode ? 'Edit Product' : 'Create New Clothing Item'}
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Provide product specifications and upload multiple showcase photos (Up to 5 images, Max 5MB each)
        </p>
      </div>

      {errorMessage && (
        <div className="rounded-2xl bg-rose-50 border border-rose-200 p-4 flex items-start gap-3 text-rose-700 text-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div>{errorMessage}</div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Core Details Card */}
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-sm space-y-6">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 border-b border-slate-100 pb-3">
            1. General Specifications
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Product Name *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Linen Blend Overshirt"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Description
              </label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Detailed fabric specs, cut style, model sizing..."
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Category *
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none font-medium"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Price (INR ₹) *
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="1499.00"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm font-mono focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Stock Quantity *
              </label>
              <input
                type="number"
                min="0"
                required
                value={stockQuantity}
                onChange={(e) => setStockQuantity(e.target.value)}
                placeholder="25"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm font-mono focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>

            <div className="flex items-center gap-3 pt-6">
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                <span className="ml-3 text-xs font-bold uppercase tracking-wider text-slate-700">
                  {isActive ? 'Active (Visible in Store)' : 'Draft (Hidden from Store)'}
                </span>
              </label>
            </div>
          </div>
        </div>

        {/* Multi-Image Upload Card */}
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900">
              2. Product Media Gallery
            </h2>
            <span className="text-xs font-bold font-mono text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-md">
              {totalImagesCount} / {MAX_IMAGES} uploaded
            </span>
          </div>

          {/* Upload Dropzone */}
          {totalImagesCount < MAX_IMAGES && (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-300 hover:border-indigo-500 rounded-2xl p-8 text-center cursor-pointer bg-slate-50/60 hover:bg-indigo-50/40 transition-colors space-y-2 group"
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/jpeg,image/png,image/webp,image/jpg"
                onChange={handleFilesSelected}
                className="hidden"
              />
              <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200 flex items-center justify-center mx-auto text-slate-400 group-hover:text-indigo-600 shadow-sm transition-colors">
                <UploadCloud className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-800">
                  Click to select photos or drag &amp; drop
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  JPG, JPEG, PNG or WebP &bull; Max 5 MB each &bull; Max 5 images
                </p>
              </div>
            </div>
          )}

          {/* Image Previews Grid */}
          {totalImagesCount > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 pt-2">
              {/* Existing Images */}
              {existingImages.map((img, idx) => (
                <div
                  key={img.id}
                  className="relative aspect-square rounded-2xl overflow-hidden border border-slate-200 shadow-sm group bg-slate-100"
                >
                  <img
                    src={img.image_url}
                    alt="Product preview"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-2 left-2 px-2 py-0.5 bg-black/60 text-white rounded text-[10px] font-mono">
                    #{idx + 1}
                  </div>
                  <button
                    type="button"
                    onClick={() => removeExistingImage(img)}
                    className="absolute top-2 right-2 p-1.5 bg-rose-600 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-rose-700 shadow"
                    title="Delete image"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}

              {/* Pending Upload Previews */}
              {pendingImages.map((pending, idx) => (
                <div
                  key={idx}
                  className="relative aspect-square rounded-2xl overflow-hidden border-2 border-indigo-500 shadow-sm group bg-slate-100"
                >
                  <img
                    src={pending.previewUrl}
                    alt="Pending upload preview"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-2 left-2 px-2 py-0.5 bg-indigo-600 text-white rounded text-[10px] font-bold">
                    New
                  </div>
                  <button
                    type="button"
                    onClick={() => removePendingImage(idx)}
                    className="absolute top-2 right-2 p-1.5 bg-rose-600 text-white rounded-lg hover:bg-rose-700 shadow"
                    title="Cancel upload"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Link
            to="/admin/products"
            className="px-6 py-3 rounded-2xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="px-8 py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/30 transition-all flex items-center gap-2 disabled:opacity-50"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{uploadProgressText || 'Saving...'}</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>{isEditMode ? 'Update Product' : 'Create Product'}</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
