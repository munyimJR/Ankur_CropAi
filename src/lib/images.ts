import paddyHarvest from "@/assets/paddy-harvest.webp.asset.json";
import greenPaddy from "@/assets/green-paddy-field.webp.asset.json";
import riceLeaf from "@/assets/rice-leaf-dew.webp.asset.json";
import villagePath from "@/assets/village-field-path.webp.asset.json";
import cattlePath from "@/assets/farmer-cattle-path.webp.asset.json";
import teaGarden from "@/assets/sylhet-tea-garden.webp.asset.json";
import cowPaddy from "@/assets/farmer-cow-paddy.webp.asset.json";
import riceplots from "@/assets/brri-rice-plots.webp.asset.json";

/** Photography: Wikimedia Commons contributors (CC BY / CC BY-SA). Credited in the footer. */
export const photos = {
  paddyHarvest: paddyHarvest.url,
  greenPaddy: greenPaddy.url,
  riceLeaf: riceLeaf.url,
  villagePath: villagePath.url,
  cattlePath: cattlePath.url,
  teaGarden: teaGarden.url,
  cowPaddy: cowPaddy.url,
  ricePlots: riceplots.url,
} as const;
