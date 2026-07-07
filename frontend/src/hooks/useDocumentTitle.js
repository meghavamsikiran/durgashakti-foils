import { useEffect } from 'react';

export const useDocumentTitle = (title, description = '') => {
  useEffect(() => {
    // Set document title
    const defaultTitle = 'DurgaShakti Foils | Premium Aluminum Foil';
    document.title = title ? `${title} | DurgaShakti Foils` : defaultTitle;

    // Set meta description tag
    if (description) {
      let metaDesc = document.querySelector('meta[name="description"]');
      if (!metaDesc) {
        metaDesc = document.createElement('meta');
        metaDesc.name = 'description';
        document.head.appendChild(metaDesc);
      }
      metaDesc.setAttribute('content', description);
    }
  }, [title, description]);
};

export default useDocumentTitle;
