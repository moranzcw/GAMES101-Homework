#include <iostream>
#include <vector>

#include "CGL/vector2D.h"

#include "mass.h"
#include "rope.h"
#include "spring.h"

namespace CGL {

    Rope::Rope(Vector2D start, Vector2D end, int num_nodes, float node_mass, float k, vector<int> pinned_nodes)
    {
        // TODO (Part 1): Create a rope starting at `start`, ending at `end`, and containing `num_nodes` nodes.
        if(num_nodes == 0 || num_nodes == 1)
            return;

        // mass
        for(int i=0; i<num_nodes; i++)
        {
            Vector2D pos =  start + i * (end-start) / (num_nodes - 1);
            Mass *p = new Mass(pos, node_mass, false);
            masses.push_back(p);
        }

        // spring
        for(int i=0; i<num_nodes-1; i++)
        {
            springs.push_back(new Spring(masses[i], masses[i+1], k));
        }

        // Comment-in this part when you implement the constructor
        for (auto &i : pinned_nodes) 
        {
            masses[i]->pinned = true;
        }
    }

    void Rope::simulateEuler(float delta_t, Vector2D gravity)
    {
        for (auto &s : springs)
        {
            // TODO (Part 2): Use Hooke's law to calculate the force on a node
            Vector2D dir = s->m2->position - s->m1->position;
            float length = dir.norm();
            Vector2D force =  s->k * (length - s->rest_length) * (dir / length);
            s->m1->forces += force;
            s->m2->forces -= force;
        }

        for (auto &m : masses)
        {
            if (!m->pinned)
            {
                // TODO (Part 2): Add the force due to gravity, then compute the new velocity and position
                m->forces += gravity * m->mass;

                // TODO (Part 2): Add global damping
                if(true)
                {
                    float damping = 0.01;
                    m->forces += - damping * m->velocity;
                }

                Vector2D acc = m->forces / m->mass;

                // Explicit method
                // m->position += m->velocity * delta_t;
                // m->velocity += a * delta_t;

                // semi-implicit method
                m->velocity += acc * delta_t;
                m->position += m->velocity * delta_t;
            }

            // Reset all forces on each mass
            m->forces = Vector2D(0, 0);
        }
    }

    void Rope::simulateVerlet(float delta_t, Vector2D gravity)
    {
        for (auto &s : springs)
        {
            // TODO (Part 3): Simulate one timestep of the rope using explicit Verlet （solving constraints)
            Vector2D dir = s->m2->position - s->m1->position;
            float length = dir.norm();
            Vector2D force = s->k * (length - s->rest_length) * (dir / length);
            s->m1->forces += force;
            s->m2->forces -= force;
        }

        for (auto &m : masses)
        {
            if (!m->pinned)
            {
                m->forces += gravity * m->mass;
                Vector2D acc = m->forces / m->mass;

                Vector2D temp_position = m->position;
                // TODO (Part 3.1): Set the new position of the rope mass
                Vector2D lastposition = m->position;
                
                // TODO (Part 4): Add global Verlet damping
                float dampfactor = 0.00005;
                m->position += (1 - dampfactor) * (m->position - m->last_position)
                                + acc * delta_t * delta_t;
                m->last_position = lastposition;
            }
            m->forces =  Vector2D(0,0);
        }
    }
}
