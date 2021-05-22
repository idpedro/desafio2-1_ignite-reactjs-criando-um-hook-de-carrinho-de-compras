import { createContext, ReactNode, useContext, useState } from "react";
import { toast } from "react-toastify";
import { api } from "../services/api";
import { Product, Stock } from "../types";

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem("@RocketShoes:cart");
    if (storagedCart) {
      return JSON.parse(storagedCart) as Product[];
    }
    return [];
  });

  async function getProductStock(productId: number) {
    const response = await api.get(`/stock/${productId}`);
    const { data } = response;
    if (data) return data as Stock;
  }

  async function getProduct(productId: number) {
    const response = await api.get(`/products/${productId}`);
    const { data } = response;
    if (data) return data as Product;
  }

  const addProduct = async (productId: number) => {
    try {
      const updatedCart = [...cart];
      const stock = await getProductStock(productId);
      const stockAmout = stock?.amount;
      const productExist = updatedCart.find(
        (product) => product.id === productId
      );

      const amount = productExist ? productExist?.amount + 1 : 1;

      if (stockAmout && amount > stockAmout) {
        toast.error("Quantidade solicitada fora de estoque");
        return;
      }
      if (productExist) {
        productExist.amount = amount;
      } else {
        const product = await getProduct(productId);
        product && updatedCart.push({ ...product, amount });
      }

      setCart(updatedCart);
      localStorage.setItem("@RocketShoes:cart", JSON.stringify(updatedCart));
    } catch {
      toast.error("Erro na adição do produto");
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const productExist = cart.find((product) => product.id === productId);
      if (!productExist) {
        toast.error("Erro na remoção do produto");
        return;
      } else {
        const updatedCart = [...cart].filter(
          (product) => product.id !== productId
        );
        setCart(updatedCart);
        localStorage.setItem("@RocketShoes:cart", JSON.stringify(updatedCart));
      }
    } catch {
      toast.error("Erro na remoção do produto");
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount <= 0) {
        return;
      }
      const stock = await getProductStock(productId);

      if (stock && amount > stock?.amount) {
        toast.error("Quantidade solicitada fora de estoque");
        return;
      }

      const newCart = [...cart];
      const productExist = newCart.find((product) => product.id === productId);
      if (productExist) {
        productExist.amount = amount;
        setCart(newCart);
        localStorage.setItem("@RocketShoes:cart", JSON.stringify(newCart));
      }
    } catch {
      toast.error("Erro na alteração de quantidade do produto");
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
