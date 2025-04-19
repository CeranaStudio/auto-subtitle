export const LoadingSpinner = () => {
  return (
    <div className="flex justify-center items-center my-4">
      <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500"></div>
      <span className="ml-3 text-gray-700">Processing...</span>
    </div>
  );
};

export default LoadingSpinner; 