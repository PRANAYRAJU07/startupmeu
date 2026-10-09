import { BrowserRouter, Routes, Route } from 'react-router-dom';

function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<div>DealPilot AI — Home</div>} />
        {/* TODO: add feature routes in Phase 9 */}
      </Routes>
    </BrowserRouter>
  );
}

export default AppRouter;
