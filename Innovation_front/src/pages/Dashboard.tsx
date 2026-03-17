import type { FC } from 'react';
import { motion } from 'motion/react';

export const Dashboard: FC = () => {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8">
      <motion.h1 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-4xl font-extrabold text-slate-900 mb-4"
      >
        Welcome to NextCare
      </motion.h1>
      <motion.p 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="text-lg text-slate-500 max-w-xl mx-auto text-center"
      >
        Select an option from the sidebar to get started.
      </motion.p>
    </div>
  );
};
