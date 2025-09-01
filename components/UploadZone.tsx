"use client";

import { useCallback } from 'react';

// 1. On définit un "contrat" (les Props) pour ce composant.
//    Il doit accepter une fonction 'onFileSelect' et un booléen 'isLoading'.
interface UploadZoneProps {
  onFileSelect: (file: File) => void;
  isLoading: boolean;
}

// 2. Le composant accepte les props définies dans le contrat.
export function UploadZone({ onFileSelect, isLoading }: UploadZoneProps) {
  
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onFileSelect(file);
    }
  };

  const handleDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (isLoading) return;

    const file = event.dataTransfer.files?.[0];
    if (file) {
      onFileSelect(file);
    }
  }, [isLoading, onFileSelect]);

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
  };

  return (
    <div 
      className="flex items-center justify-center w-full"
      onDrop={handleDrop}
      onDragOver={handleDragOver}
    >
      <label 
        htmlFor="dropzone-file" 
        className={`flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-lg bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-500 ${isLoading ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600'}`}
      >
        <div className="flex flex-col items-center justify-center pt-5 pb-6">
          <svg className="w-8 h-8 mb-4 text-gray-500 dark:text-gray-400" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 16">
            <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2"/>
          </svg>
          {isLoading ? (
            <p className="text-lg text-gray-500 dark:text-gray-400">Traitement en cours...</p>
          ) : (
            <>
              <p className="mb-2 text-sm text-gray-500 dark:text-gray-400"><span className="font-semibold">Glissez-déposez</span> votre fichier ici</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">ou</p>
              <button type="button" className="mt-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                Choisir un fichier
              </button>
            </>
          )}
          <p className="mt-4 text-xs text-gray-500 dark:text-gray-400">PDF uniquement - Max. 50 Mo</p>
        </div>
        <input id="dropzone-file" type="file" className="hidden" onChange={handleFileChange} accept=".pdf" disabled={isLoading} />
      </label>
    </div>
  );
}
