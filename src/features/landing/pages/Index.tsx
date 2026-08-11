import Hero from "@/features/landing/components/Hero";
import BenefitsClients from "@/features/landing/components/BenefitsClients";
import BenefitsBusiness from "@/features/landing/components/BenefitsBusiness";
import HowItWorks from "@/features/landing/components/HowItWorks";
import RecommendedBusinesses from "@/features/landing/components/RecommendedBusinesses";
import Categories from "@/features/landing/components/Categories";
import BusinessCTA from "@/features/landing/components/BusinessCTA";
import VIPPlan from "@/features/landing/components/VIPPlan";

const Index = () => {
  return (
    <div>
      <Hero />
      <Categories />
      <RecommendedBusinesses />
      <BenefitsClients />
      <BenefitsBusiness />
      <HowItWorks />
      <BusinessCTA />
      <VIPPlan />
    </div>
  );
};

export default Index;
