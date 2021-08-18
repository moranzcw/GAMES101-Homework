//
// Created by Göksu Güvendiren on 2019-05-14.
//

#include "Scene.hpp"


void Scene::buildBVH() {
    printf(" - Generating BVH...\n\n");
    this->bvh = new BVHAccel(objects, 1, BVHAccel::SplitMethod::NAIVE);
}

Intersection Scene::intersect(const Ray &ray) const
{
    return this->bvh->Intersect(ray);
}

void Scene::sampleLight(Intersection &pos, float &pdf) const
{
    float emit_area_sum = 0;
    for (uint32_t k = 0; k < objects.size(); ++k) {
        if (objects[k]->hasEmit()){
            emit_area_sum += objects[k]->getArea();
        }
    }
    float p = get_random_float() * emit_area_sum;
    emit_area_sum = 0;
    for (uint32_t k = 0; k < objects.size(); ++k) {
        if (objects[k]->hasEmit()){
            emit_area_sum += objects[k]->getArea();
            if (p <= emit_area_sum){
                objects[k]->Sample(pos, pdf);
                break;
            }
        }
    }
}

bool Scene::trace(
        const Ray &ray,
        const std::vector<Object*> &objects,
        float &tNear, uint32_t &index, Object **hitObject)
{
    *hitObject = nullptr;
    for (uint32_t k = 0; k < objects.size(); ++k) {
        float tNearK = kInfinity;
        uint32_t indexK;
        Vector2f uvK;
        if (objects[k]->intersect(ray, tNearK, indexK) && tNearK < tNear) {
            *hitObject = objects[k];
            tNear = tNearK;
            index = indexK;
        }
    }


    return (*hitObject != nullptr);
}

void clampZero(Vector3f &v)
{
    if(v.x < 0) v.x = 0;
    if(v.y < 0) v.y = 0;
    if(v.z < 0) v.z = 0;
}

// Implementation of Path Tracing
Vector3f Scene::castRay(const Ray &ray, int depth) const
{
    // TO DO Implement Path Tracing Algorithm herVector3f(e
    Intersection intersection = intersect(ray);
    
    if(!intersection.happened)
        return Vector3f(0);
    if(intersection.m->hasEmission())
    {
        if(depth == 0)
            return intersection.m->getEmission();
        else
            return Vector3f(0);
    }

    Vector3f& p = intersection.coords;
    Vector3f wo = normalize(-ray.direction);
    Vector3f N = normalize(intersection.normal);
    Material*& material = intersection.m;

    // direct
    Vector3f L_dir; 
    {
        Intersection inter; 
        float pdf_light;
        sampleLight(inter, pdf_light);

        Vector3f &x = inter.coords;
        Vector3f ws = normalize(x - p);
        Vector3f NN = normalize(inter.normal);
        
        auto block_test = intersect(Ray(p, ws));
        if(block_test.happened && (block_test.coords-x).norm() < 1e-2) 
        {
            L_dir = inter.emit * material->eval(ws, wo, N) * dotProduct(ws, N) 
                * dotProduct(NN, -ws) / (dotProduct((x-p), (x-p)) * pdf_light);
            clampZero(L_dir);
        }
    }
    // indirect
    Vector3f L_indir;
    {
        float RR = this->RussianRoulette;
        if(get_random_float() < RR) 
        {
            Vector3f wi = normalize(material->sample(wo, N));
            Vector3f color =  castRay(Ray(p, wi), depth+1);
            L_indir = color * material->eval(wi, wo, N) * dotProduct(wi, N)
                / (material->pdf(wi, wo, N) * RR);
            clampZero(L_indir);
        }
    }
    return L_dir + L_indir;
}