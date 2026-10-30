import { investmentsEndpoints as e, getEndpointRouterPath, PERMISSIONS } from "@luraba/contracts";
import { Router } from "express";
import { requireAccess } from "@/middleware/access.middleware";
import * as c from "./investments.controller";

const router = Router();
const read = requireAccess({ permission: PERMISSIONS.INVESTMENTS_READ });
const write = requireAccess({ permission: PERMISSIONS.INVESTMENTS_WRITE });
const remove = requireAccess({ permission: PERMISSIONS.INVESTMENTS_DELETE });
const path = getEndpointRouterPath;

router.get(path(e.getSettings), read, c.getSettings);
router.patch(path(e.updateSettings), write, c.updateSettings);

router.get(path(e.listPortfolios), read, c.listPortfolios);
router.post(path(e.createPortfolio), write, c.createPortfolio);
router.put(path(e.setAllocationTargets), write, c.setAllocationTargets);
router.patch(path(e.updatePortfolio), write, c.updatePortfolio);
router.delete(path(e.deletePortfolio), remove, c.deletePortfolio);

router.get(path(e.listAccounts), read, c.listAccounts);
router.post(path(e.createAccount), write, c.createAccount);
router.get(path(e.getAccount), read, c.getAccount);
router.patch(path(e.updateAccountSettings), write, c.updateAccountSettings);
router.get(path(e.getAccountCash), read, c.getAccountCash);
router.post(path(e.addCashMovement), write, c.addCashMovement);

// Static asset paths first so `/assets/search` is not read as an id.
router.get(path(e.searchAssets), read, c.searchAssets);
router.post(path(e.importCandidate), write, c.importCandidate);
router.get(path(e.listAssets), read, c.listAssets);
router.post(path(e.createAsset), write, c.createAsset);
router.get(path(e.getAsset), read, c.getAsset);
router.patch(path(e.updateAsset), write, c.updateAsset);
router.put(path(e.setFixedIncomeTerms), write, c.setFixedIncomeTerms);
router.get(path(e.getAssetDetail), read, c.getAssetDetail);
router.post(path(e.setManualPrice), write, c.setManualPrice);
router.get(path(e.getPriceOn), read, c.getPriceOn);

router.get(path(e.listEvents), read, c.listEvents);
router.post(path(e.createEvent), write, c.createEvent);
router.patch(path(e.updateEvent), write, c.updateEvent);
router.delete(path(e.deleteEvent), remove, c.deleteEvent);

router.get(path(e.listPositions), read, c.listPositions);
router.get(path(e.getDashboard), read, c.getDashboard);
router.get(path(e.getIncome), read, c.getIncome);
router.get(path(e.getTaxes), read, c.getTaxes);
router.post(path(e.markDarfPaid), write, c.markDarfPaid);
router.get(path(e.getHoldingsAt), read, c.getHoldingsAt);

router.get(path(e.getAllocation), read, c.getAllocation);
router.get(path(e.getRebalance), read, c.getRebalance);

router.get(path(e.listProviders), read, c.listProviders);
router.patch(path(e.updateProvider), write, c.updateProvider);
router.post(path(e.refreshPrices), write, c.refreshPrices);

export default router;
