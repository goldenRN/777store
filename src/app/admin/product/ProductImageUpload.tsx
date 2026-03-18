// 'use client';

// import { useState } from 'react';

// interface ProductImageUploadProps {
//   productId?: number; // эсвэл string
// }

// export default function ProductImageUpload({ productId }: ProductImageUploadProps) {
//   const [files, setFiles] = useState<FileList | null>(null);
//   const [progress, setProgress] = useState<number | null>(null);

//   const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
//     e.preventDefault();
//     if (!files) return;

//     const form = new FormData();
//     for (let i = 0; i < files.length; i++) {
//       form.append('images', files[i]);
//     }

//     const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/products/${productId}/images`, {
//       method: 'POST',
//       body: form,
//     });

//     const data = await res.json();
//     console.log(data);
//   };

//   return (
//     <form onSubmit={handleSubmit}>
//       <input
//         type="file"
//         accept="image/*"
//         multiple
//         onChange={(e) => setFiles(e.target.files)}
//       />
//       <button type="submit">Upload</button>
//       {progress && <div>{progress}</div>}
//     </form>
//   );
// }

'use client';

import { useState } from 'react';

interface ProductImageUploadProps {
  productId?: number;
}

export default function ProductImageUpload({ productId }: ProductImageUploadProps) {
  const [files, setFiles] = useState<FileList | null>(null);
  const [previews, setPreviews] = useState<string[]>([]);
  const [progress, setProgress] = useState<number>(0);

  const handleSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files;
    setFiles(f);

    if (f) {
      const urls = Array.from(f).map((file) => URL.createObjectURL(file));
      setPreviews(urls);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!files) return;

    const form = new FormData();
    Array.from(files).forEach((file) => form.append('images', file));

    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${process.env.NEXT_PUBLIC_API_URL}/api/products/${productId}/images`);

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        setProgress(Math.round((event.loaded / event.total) * 100));
      }
    };

    xhr.onload = () => console.log('Uploaded:', xhr.responseText);
    xhr.send(form);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">

      <input type="file" multiple accept="image/*" onChange={handleSelect} />

      {/* Preview images */}
      <div className="flex gap-2 mt-2">
        {previews.map((src, idx) => (
          <img key={idx} src={src} className="w-20 h-20 rounded object-cover" />
        ))}
      </div>

      {progress > 0 && <div>Upload: {progress}%</div>}

      <button type="submit" className="bg-blue-600 text-white px-4 py-1 rounded">
        Upload
      </button>
    </form>
  );
}

