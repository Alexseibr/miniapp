import { Router } from 'express';
import CategoryEvolutionService from '../../services/CategoryEvolutionService.js';
import asyncHandler from '../middleware/asyncHandler.js';

const router = Router();

router.get(
  '/',
  asyncHandler(async (req, res) => {
    try {
      const proposals = await CategoryEvolutionService.getPendingProposals();
      
      res.json({
        ok: true,
        proposals,
        total: proposals.length,
      });
    } catch (error) {
      console.error('Get proposals error:', error);
      res.status(500).json({
        ok: false,
        error: 'Failed to fetch proposals',
      });
    }
  })
);

router.get(
  '/stats',
  asyncHandler(async (req, res) => {
    try {
      const stats = await CategoryEvolutionService.getStats();
      
      res.json({
        ok: true,
        stats,
      });
    } catch (error) {
      console.error('Get stats error:', error);
      res.status(500).json({
        ok: false,
        error: 'Failed to fetch stats',
      });
    }
  })
);

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    
    try {
      const proposalData = await CategoryEvolutionService.getProposalWithAds(id);
      
      if (!proposalData) {
        return res.status(404).json({
          ok: false,
          error: 'Proposal not found',
        });
      }
      
      res.json({
        ok: true,
        ...proposalData,
      });
    } catch (error) {
      console.error('Get proposal error:', error);
      res.status(500).json({
        ok: false,
        error: 'Failed to fetch proposal',
      });
    }
  })
);

router.post(
  '/:id/approve',
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const adminId = req.adminId || req.body.adminId;
    const { slug, name, notes, minAdsThreshold, visibilityScope } = req.body;
    
    try {
      const result = await CategoryEvolutionService.approveProposal(id, adminId, {
        slug,
        name,
        notes,
        minAdsThreshold,
        visibilityScope,
      });
      
      res.json({
        ok: true,
        message: `Category "${result.newCategory.name}" created successfully`,
        ...result,
      });
    } catch (error) {
      console.error('Approve proposal error:', error);
      res.status(400).json({
        ok: false,
        error: error.message || 'Failed to approve proposal',
      });
    }
  })
);

router.post(
  '/:id/reject',
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const adminId = req.adminId || req.body.adminId;
    const { reason } = req.body;
    
    try {
      const result = await CategoryEvolutionService.rejectProposal(id, adminId, reason);
      
      res.json({
        ok: true,
        message: 'Proposal rejected',
        proposal: result,
      });
    } catch (error) {
      console.error('Reject proposal error:', error);
      res.status(400).json({
        ok: false,
        error: error.message || 'Failed to reject proposal',
      });
    }
  })
);

router.post(
  '/analyze',
  asyncHandler(async (req, res) => {
    try {
      const results = await CategoryEvolutionService.analyzeOtherCategories();
      
      res.json({
        ok: true,
        message: 'Analysis completed',
        proposalsCreated: results.length,
        proposals: results,
      });
    } catch (error) {
      console.error('Analyze categories error:', error);
      res.status(500).json({
        ok: false,
        error: 'Failed to analyze categories',
      });
    }
  })
);

export default router;
