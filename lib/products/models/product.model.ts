export interface ProductModel {
    count: number;
    description: string;
    price: number;
    title: string;
}

export interface ProductDTO extends ProductModel {
    id: string;
}
